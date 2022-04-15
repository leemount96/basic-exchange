import React from "react";

// Form shown to connected user if they were NOT the initializer of the offer
// Should display:
//  *base token address
//  *target token address
//  *amount of base token in contract
//  *price of the offer
// Should allow the user to:
//  *accept the offer for given amount
//  *properly display errors for incorrect values
export function AcceptOffer({ acceptOffer }) {
  return (
    <div>
      <h4>Accept Offer</h4>
      <form
        onSubmit={(event) => {
          // This function calls the createOffer function with form data
          event.preventDefault();

          const formData = new FormData(event.target);
          const amount = formData.get("amount");

          if (amount) {
            acceptOffer(amount);
          }
        }}
      >
        <div className="form-group">
          <label>Amount of token Y to send</label>
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
          <input className="btn btn-primary" type="submit" value="Offer" />
        </div>
      </form>
    </div>
  );
}
