import React from "react";

// Form for creating offer
// includes fields for: 
//  *base token
//  *target token
//  *amount of base toekn
//  *price in terms of target token

export function CreateOffer({ createOffer }) {
  return (
    <div>
      <h4>Create Offer</h4>
      <form
        onSubmit={(event) => {
          // This function calls the createOffer function with form data
          event.preventDefault();

          const formData = new FormData(event.target);
          const baseToken = formData.get("basetoken");
          const targetToken = formData.get("targettoken");
          const amount = formData.get("amount");
          const price = formData.get("price");

          if (baseToken && targetToken && amount && price) {
            createOffer(baseToken, targetToken, amount, price);
          }
        }}
      >
        <div className="form-group">
          <label>Address for base token</label>
          <input
            className="form-control"
            type="text"
            name="basetoken"
            placeholder="0x..."
            required
          />
        </div>
        <div className="form-group">
          <label>Address for desired token</label>
          <input 
            className="form-control" 
            type="text" 
            name="targettoken"
            placeholder="0x..."
            required 
          />
        </div>
        <div className="form-group">
          <label>Amount of base token to offer</label>
          <input 
            className="form-control" 
            type="number" 
            step="1"
            name="amount"
            placeholder="1"
            required 
          />
        </div>
        <div className="form-group">
          <label>Price as target token per base token</label>
          <input 
            className="form-control" 
            type="number" 
            step="1"
            name="price"
            placeholder="1"
            required 
          />
        </div>
        <div className="form-group">
          <input className="btn btn-primary" type="submit" value="Offer" />
        </div>
      </form>
    </div>
  );
}
