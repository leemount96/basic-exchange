import React from "react";

// Form shown to connected user if they were the initializer of the offer
// Should display:
//  *base token address
//  *target token address
//  *amount of base token in contract
//  *price of the offer
// Should also allow the user to:
//  *modify the price of the offer
//  *cancel the offer
export function ModifyOffer({ modifyOffer, cancelOffer }) {
  return (
    <div>
      <h4>Modify or Cancel Existing Offer</h4>
      <form
        onSubmit={(event) => {
          // This function just calls the transferTokens callback with the
          // form's data.
          event.preventDefault();

          const formData = new FormData(event.target);
          const newPrice = formData.get("price");

          if (newPrice) {
            modifyOffer(newPrice);
          }
        }}
      >
        <div className="form-group">
          <label>New price for offer</label>
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
        <div className="form-group">
          <button
          className="btn btn-warning"
          type="button"
          //TODO
          //onClick{cancelOffer}
          >
            Cancel Offer
          </button>
        </div>
      </form>
    </div>
  );
}
