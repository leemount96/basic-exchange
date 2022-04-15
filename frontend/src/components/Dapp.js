import React from "react";

// We'll use ethers to interact with the Ethereum network and our contract
import { ethers } from "ethers";

// We import the contract's artifacts and address here, as we are going to be
// using them with ethers
import ExchangeArtifact from "../contracts/Exchange.json";
import contractAddress from "../contracts/contract-address.json";

// All the logic of this dapp is contained in the Dapp component.
// These other components are just presentational ones: they don't have any
// logic. They just render HTML.
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { CreateOffer } from "./CreateOffer";
import { ModifyOffer } from "./ModifyOffer";
import { AcceptOffer } from "./AcceptOffer";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";
import { NoTokensMessage } from "./NoTokensMessage";

// This is the Hardhat Network id, you might change it in the hardhat.config.js.
// If you are using MetaMask, be sure to change the Network id to 1337.
// Here's a list of network ids https://docs.metamask.io/guide/ethereum-provider.html#properties
// to use when deploying to other networks.
const HARDHAT_NETWORK_ID = '31337';

// This is an error code that indicates that the user canceled a transaction
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

// This component is in charge of doing these things:
//   1. It connects to the user's wallet
//   2. Initializes ethers and the Token contract
//   3. Polls the user balance to keep it updated.
//   4. Transfers tokens by sending transactions
//   5. Renders the whole application
//
// Note that (3) and (4) are specific of this sample application, but they show
// you how to keep your Dapp and contract's state in sync,  and how to send a
// transaction.
export class Dapp extends React.Component {
  constructor(props) {
    super(props);

    // We store multiple things in Dapp's state.
    // You don't need to follow this pattern, but it's an useful example.
    this.initialState = {
      // information about exchange
      exchangeData: undefined,
      // bool for checking if there is an offer
      outstandingOffer: false,
      // info about current offer
      offerData: undefined,
      currentAddress: undefined,
      // The ID about transactions being sent, and any possible error with them
      txBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
    };

    this.state = this.initialState;
  }

  render() {
    // Ethereum wallets inject the window.ethereum object. If it hasn't been
    // injected, we instruct the user to install MetaMask.
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    // The next thing we need to do, is to ask the user to connect their wallet.
    // When the wallet gets connected, we are going to save the users's address
    // in the component's state. So, if it hasn't been saved yet, we have
    // to show the ConnectWallet component.
    //
    // Note that we pass it a callback that is going to be called when the user
    // clicks a button. This callback just calls the _connectWallet method.
    if (!this.state.currentAddress) {
      return (
        <ConnectWallet 
          connectWallet={() => this._connectWallet()} 
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    // If exchange data hasn't loaded, display a loading screen
    if (!this.exchangeData) {
      return <Loading />;
    }

    // Logic to be implemented:
    // *if no outstanding offer, display createOffer form
    // *if there is an outstanding offer:
    //    *if connected user = initializer, display modify/cancel form
    //    *if connected user != initializer, display acceptOffer form

    // If everything is loaded, we render the application.
    return (
      <div className="container p-4">
        <div className="row">
          <div className="col-12">
            <h1>
              ERC20 Token Exchange
            </h1>
            <p>
              Welcome <b>{this.state.currentAddress}</b>, please create an offer
            </p>
          </div>
        </div>

        <hr />

        <div className="row">
          <div className="col-12">
            {/* 
              Sending a transaction isn't an immediate action. You have to wait
              for it to be mined.
              If we are waiting for one, we show a message here.
            */}
            {this.state.txBeingSent && (
              <WaitingForTransactionMessage txHash={this.state.txBeingSent} />
            )}

            {/* 
              Sending a transaction can fail in multiple ways. 
              If that happened, we show a message here.
            */}
            {this.state.transactionError && (
              <TransactionErrorMessage
                message={this._getRpcErrorMessage(this.state.transactionError)}
                dismiss={() => this._dismissTransactionError()}
              />
            )}
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            {/*
              If the user has no tokens, we don't show the Transfer form
            */}
            {this.state.balance.eq(0) && (
              <NoTokensMessage selectedAddress={this.state.selectedAddress} />
            )}

            {/*
              This component displays a form that the user can use to create an offer
            */}
            {this.state.balance.gt(0) && (
              <CreateOffer
                createOffer={(baseToken, targetToken, amount, price) =>
                  this._createOffer(baseToken, targetToken, amount, price)
                }
              />
            )}
            {/*
              If no outstanding offer, display createOffer form
            */}

            {/*
              If outstanding offer and currentAddress is initializer, display modifyOffer form
            */}

            {/*
              If outstanding offer and currentAddress is not initializer, display acceptOffer form
            */}
          </div>
        </div>
      </div>
    );
  }

  componentWillUnmount() {
    // We poll the user's balance, so we have to stop doing that when Dapp
    // gets unmounted
    this._stopPollingData();
  }

  async _connectWallet() {
    // This method is run when the user clicks the Connect. It connects the
    // dapp to the user's wallet, and initializes it.

    // To connect to the user's wallet, we have to run this method.
    // It returns a promise that will resolve to the user's address.
    const [currentAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });

    // Once we have the address, we can initialize the application.

    // First we check the network
    if (!this._checkNetwork()) {
      return;
    }

    this._initialize(currentAddress);

    // We want to reinitialize some aspects, but maintain most of the state, so need to modify this
    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this._stopPollingData();
      // `accountsChanged` event can be triggered with an undefined newAddress.
      // This happens when the user removes the Dapp from the "Connected
      // list of sites allowed access to your addresses" (Metamask > Settings > Connections)
      // To avoid errors, we reset the dapp state 
      if (newAddress === undefined) {
        return this._resetState();
      }
      
      this._initialize(newAddress);
    });
    
    // We reset the dapp state if the network is changed
    window.ethereum.on("chainChanged", ([networkId]) => {
      this._stopPollingData();
      this._resetState();
    });
  }

  _initialize(userAddress) {
    // This method initializes the dapp

    // We first store the user's address in the component's state
    this.setState({
      currentAddress: userAddress,
    });

    // Then, we initialize ethers, fetch the token's data, and start polling
    // for the user's balance.

    // Fetching the token data and the user's balance are specific to this
    // sample project, but you can reuse the same initialization pattern.
    this._initializeEthers();
    this._getExchangeData();
    this._startPollingData();
  }

  async _initializeEthers() {
    // We first initialize ethers by creating a provider using window.ethereum
    this._provider = new ethers.providers.Web3Provider(window.ethereum);

    // Then, we initialize the contract using that provider and the token's
    // artifact. You can do this same thing with your contracts.
    this._exchange = new ethers.Contract(
      contractAddress.Exchange,
      ExchangeArtifact.abi,
      this._provider.getSigner(0)
    );
  }

  // Poll data from contract, need to add logic to do different things depending on state/user
  _startPollingData() {
    this._pollDataInterval = setInterval(() => this._updateOffer(), 1000);

    // We run it once immediately so we don't have to wait for it
    this._updateOffer();
  }

  _stopPollingData() {
    clearInterval(this._pollDataInterval);
    this._pollDataInterval = undefined;
  }

  // get owner of exchange, essentially just a check that it has been initialized
  async _getExchangeData() {
    const owner = await this._exchange.owner();

    this.setState({ exchangeData: { owner } });
  }

  // update state with offer data
  async _getOfferData() {
    const tokenX = await this._exchange.tokenX();
    const tokenY = await this._exchange.tokenY();
    const price = await this._exchange.price();
    const initializer = await this._exchange.initializer();
    const outstandingOffer = await this._exchange.outstandingOffer();

    //need to figure out how to get token functions
    //const amountX = await tokenX.balanceOf(this._exchange.address);

    //set state offerData
    this.setState({ offerData: { tokenX, tokenY, price, initializer } });
    this.setState({ outstandingOffer });
  }

  // for now, just call _getOfferData, will change to update depending on user
  async _updateOffer() {
    // const balance = await this._token.balanceOf(this.state.selectedAddress);
    // this.setState({ balance });
    this._getOfferData();
  }

  // This method creates a new offer
  async _createOffer(baseToken, targetToken, amount, price) {
    // Sending a transaction is a complex operation:
    //   - The user can reject it
    //   - It can fail before reaching the ethereum network (i.e. if the user
    //     doesn't have ETH for paying for the tx's gas)
    //   - It has to be mined, so it isn't immediately confirmed.
    //     Note that some testing networks, like Hardhat Network, do mine
    //     transactions immediately, but your dapp should be prepared for
    //     other networks.
    //   - It can fail once mined.
    //
    // This method handles all of those things, so keep reading to learn how to
    // do it.

    try {
      this._dismissTransactionError();

      // Send the createOffer transaction and save the hash
      const tx = await this._exchange.createOffer(baseToken, targetToken, amount, price);
      this.setState({ txBeingSent: tx.hash });

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Check for error in transaction
      if (receipt.status === 0) {
        throw new Error("Create offer failed");
      }

      // if we get here transaction was successful, so update state
      
      await this._getOfferData();

      await this._updateBalance();

    } catch (error) {
      // if user rejected error, do nothing
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      // log errors for debugging
      console.error(error);
      this.setState({ transactionError: error });

    } finally {
      // transaction no longer being sent so reset state variable
      this.setState({ txBeingSent: undefined });
    }
  }

  // Modify existing offer
  async _modifyOffer(price) {
    try {
      this._dismissTransactionError();

      // Send the modifyOffer transaction and save the hash
      const tx = await this._exchange.updatePrice(price);
      this.setState({ txBeingSent: tx.hash });

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Check for error in transaction
      if (receipt.status === 0) {
        throw new Error("Modify offer failed");
      }

      // if we get here transaction was successful, so update state
      await this._getOfferData();

      await this._updateBalance();

    } catch (error) {
      // if user rejected error, do nothing
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      // log errors for debugging
      console.error(error);
      this.setState({ transactionError: error });

    } finally {
      // transaction no longer being sent so reset state variable
      this.setState({ txBeingSent: undefined });
    }
  }

  // Cancel existing offer
  async _cancelOffer() {
    try {
      this._dismissTransactionError();

      // Send the cancelOffer transaction and save the hash
      const tx = await this._exchange._cancelOffer();
      this.setState({ txBeingSent: tx.hash });

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Check for error in transaction
      if (receipt.status === 0) {
        throw new Error("Cancel offer failed");
      }

      // if we get here transaction was successful, so update state
      await this._resetState();

    } catch (error) {
      // if user rejected error, do nothing
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      // log errors for debugging
      console.error(error);
      this.setState({ transactionError: error });

    } finally {
      // transaction no longer being sent so reset state variable
      this.setState({ txBeingSent: undefined });
    }
  }

  // Accept existing offer
  async _acceptOffer(amount) {
    try {
      this._dismissTransactionError();

      // Send the modifyOffer transaction and save the hash
      const tx = await this._exchange.acceptOffer(amount);
      this.setState({ txBeingSent: tx.hash });

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Check for error in transaction
      if (receipt.status === 0) {
        throw new Error("Accept offer failed");
      }

      // if we get here transaction was successful, so update state
      await this._getOfferData();

      // check if contract has returned false for outstanding offer (ie. took the full size)
      if (!this.state.outstandingOffer) {
        await this._resetState()
      }

      await this._updateBalance();

    } catch (error) {
      // if user rejected error, do nothing
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      // log errors for debugging
      console.error(error);
      this.setState({ transactionError: error });

    } finally {
      // transaction no longer being sent so reset state variable
      this.setState({ txBeingSent: undefined });
    }
  }

  // This method just clears part of the state.
  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }

  // This method just clears part of the state.
  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  // This is an utility method that turns an RPC error into a human readable
  // message.
  _getRpcErrorMessage(error) {
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  }

  // This method resets the state
  _resetState() {
    this.setState(this.initialState);
  }

  // This method checks if Metamask selected network is Localhost:8545 
  _checkNetwork() {
    if (window.ethereum.networkVersion === HARDHAT_NETWORK_ID) {
      return true;
    }

    this.setState({ 
      networkError: 'Please connect Metamask to Localhost:8545'
    });

    return false;
  }
}
