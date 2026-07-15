import React, { useState } from "react";
import "./Stall.css";
import NoCCNDay from "../assets/NoCCNDay.svg";
import AddProduct from "../assets/AddProduct.png";
import CCNDAYTP from "../assets/CCNDAYTP.png"

const stallPageStates = {
  NO_CCN_DAY: "noCcnDay",
  CAN_APPLY: "canApply",
  HAS_STALL: "hasStall",
  CANNOT_APPLY: "cannotApply",
};

const mockCCNDay = {
  CCNDayID: 1,
  CCNName: "CCN Day 2026",
  CCNDescription:
    "A campus-wide carnival where students and staff can explore food, games, gifts, services, performances, and student-led fundraising stalls.",
  StartDateTime: 1783942260,
  EndDateTime: 1783942500,
  StallRegistrationStartDateTime: 1783941840,
  StallRegistrationEndDateTime: 1783942200,
};

const mockOwnedStall = {
  StallID: 1,
  StallName: "Sweet Cloud Bakery",
  StallDescription:
    "Treat yourself to freshly baked brownies, cookies, cupcakes, and other student-made desserts prepared specially for CCN Day.",
  StallImage:
    "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=1200&q=80",
  stallType: "Food & Beverages",
  StallOwnerWallet: "0x3B1646AD20F85AA32197203D044A96C682572C10",
  StallLocation: "Block 21, Booth A05",
  StallSchool: "IIT",
  NeedElectricalPort: false,
  CreatedAt: 1720455100,
  stallStatus: "Open",
  AllowedWithdrawal: false,
  CCNDayID: 1,
};

const mockProducts = [
  {
    ProductID: 1,
    StallID: 1,
    ProductName: "Chocolate Brownie",
    ProductDescription:
      "Rich and fudgy chocolate brownie baked fresh with a soft centre.",
    ProductImage:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80",
    ProductPrice: "5000000000000000",
    productStatus: "Available",
  },
  {
    ProductID: 2,
    StallID: 1,
    ProductName: "Vanilla Cupcake",
    ProductDescription:
      "Soft vanilla cupcake topped with buttercream and colourful sprinkles.",
    ProductImage:
      "https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=900&q=80",
    ProductPrice: "7000000000000000",
    productStatus: "Available",
  },
  {
    ProductID: 3,
    StallID: 1,
    ProductName: "Cookie Pack",
    ProductDescription:
      "A small pack of homemade cookies suitable for sharing with friends.",
    ProductImage:
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80",
    ProductPrice: "4000000000000000",
    productStatus: "Unavailable",
  },
];

const stallTypeOptions = [
  "Food & Beverages",
  "Games",
  "Gifts",
  "Pre-owned / Recycling",
  "Services",
  "Performance / Busking",
  "Others",
];

const formatDateTime = (unixTimestamp) => {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(unixTimestamp * 1000));
};

const formatWalletAddress = (walletAddress) => {
  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
};

// const handleSubmitStallApplication = (event) => {
//   event.preventDefault();
//   console.log("Mock stall application submitted:", stallForm);
// };

const formatWeiToEth = (weiValue) => {
  const wei = BigInt(weiValue);
  const ether = 10n ** 18n;
  const whole = wei / ether;
  const fraction = (wei % ether).toString().padStart(18, "0").slice(0, 4);
  const cleanedFraction = fraction.replace(/0+$/, "");

  return `${whole}${cleanedFraction ? `.${cleanedFraction}` : ""} ETH`;
};

const Stall = () => {
  const [stallPageState, setStallPageState] = useState(
    stallPageStates.CAN_APPLY,
  );

  const [stallForm, setStallForm] = useState({
    StallName: "",
    StallDescription: "",
    StallImage: "",
    stallType: "Food & Beverages",
    NeedElectricalPort: false,
  });

  const [ownedStall, setOwnedStall] = useState(mockOwnedStall);
  const [products, setProducts] = useState(mockProducts);

  const [activeModal, setActiveModal] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const [stallStatusForm, setStallStatusForm] = useState(
    mockOwnedStall.stallStatus,
  );

  const [productForm, setProductForm] = useState({
    ProductName: "",
    ProductDescription: "",
    ProductImage: "",
    ProductPrice: "",
    productStatus: "Available",
  });

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setStallForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;

    setStallForm((currentForm) => ({
      ...currentForm,
      [name]: checked,
    }));
  };

  const handleSubmitStallApplication = (event) => {
    event.preventDefault();
    console.log("Mock stall application submitted:", stallForm);
  };

  const handleWithdrawStallPayments = () => {
    console.log("Mock withdraw stall payments clicked");
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedProduct(null);
  };

  const openEditStallModal = () => {
    setStallStatusForm(ownedStall.stallStatus);
    setActiveModal("editStall");
  };

  const openDeleteStallModal = () => {
    setActiveModal("deleteStall");
  };

  const handleUpdateStallStatus = (event) => {
    event.preventDefault();

    setOwnedStall((currentStall) => ({
      ...currentStall,
      stallStatus: stallStatusForm,
    }));

    setActiveModal("success");
    setSuccessMessage("Stall status has been updated successfully.");
  };

  const handleConfirmDeleteStall = () => {
    setActiveModal("success");
    setSuccessMessage("Stall has been deleted successfully.");

    setTimeout(() => {
      setStallPageState(stallPageStates.CAN_APPLY);
      closeModal();
    }, 900);
  };

  const openEditProductModal = (product) => {
    setSelectedProduct(product);

    setProductForm({
      ProductName: product.ProductName,
      ProductDescription: product.ProductDescription,
      ProductImage: product.ProductImage,
      ProductPrice: product.ProductPrice,
      productStatus: product.productStatus,
    });

    setActiveModal("editProduct");
  };

  const openDeleteProductModal = (product) => {
    setSelectedProduct(product);
    setActiveModal("deleteProduct");
  };

  const openCreateProductModal = () => {
    setSelectedProduct(null);

    setProductForm({
      ProductName: "",
      ProductDescription: "",
      ProductImage: "",
      ProductPrice: "",
      productStatus: "Available",
    });

    setActiveModal("createProduct");
  };

  const handleProductFormChange = (event) => {
    const { name, value } = event.target;

    setProductForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleUpdateProduct = (event) => {
    event.preventDefault();

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.ProductID === selectedProduct.ProductID
          ? {
              ...product,
              ProductName: productForm.ProductName,
              ProductDescription: productForm.ProductDescription,
              ProductImage: productForm.ProductImage,
              ProductPrice: productForm.ProductPrice,
            }
          : product,
      ),
    );

    setActiveModal("success");
    setSuccessMessage("Product has been updated successfully.");
  };

  const handleCreateProduct = (event) => {
    event.preventDefault();

    const nextProductId =
      products.length === 0
        ? 1
        : Math.max(...products.map((product) => product.ProductID)) + 1;

    const newProduct = {
      ProductID: nextProductId,
      StallID: ownedStall.StallID,
      ProductName: productForm.ProductName,
      ProductDescription: productForm.ProductDescription,
      ProductImage: productForm.ProductImage,
      ProductPrice: productForm.ProductPrice,
      productStatus: "Available",
    };

    setProducts((currentProducts) => [...currentProducts, newProduct]);

    setActiveModal("success");
    setSuccessMessage("Product has been created successfully.");
  };

  const handleConfirmDeleteProduct = () => {
    setProducts((currentProducts) =>
      currentProducts.filter(
        (product) => product.ProductID !== selectedProduct.ProductID,
      ),
    );

    setActiveModal("success");
    setSuccessMessage("Product has been deleted successfully.");
  };

  return (
    <div className="stall-page">
      <div className="stall-mock-switcher">
        <button
          type="button"
          className={
            stallPageState === stallPageStates.NO_CCN_DAY ? "active" : ""
          }
          onClick={() => setStallPageState(stallPageStates.NO_CCN_DAY)}
        >
          No CCN Day
        </button>

        <button
          type="button"
          className={
            stallPageState === stallPageStates.CAN_APPLY ? "active" : ""
          }
          onClick={() => setStallPageState(stallPageStates.CAN_APPLY)}
        >
          Apply View
        </button>

        <button
          type="button"
          className={
            stallPageState === stallPageStates.CANNOT_APPLY ? "active" : ""
          }
          onClick={() => setStallPageState(stallPageStates.CANNOT_APPLY)}
        >
          Staff Not Whitelisted
        </button>

        <button
          type="button"
          className={
            stallPageState === stallPageStates.HAS_STALL ? "active" : ""
          }
          onClick={() => setStallPageState(stallPageStates.HAS_STALL)}
        >
          My Stall View
        </button>
      </div>

      {stallPageState === stallPageStates.NO_CCN_DAY && (
        <section className="stall-centered-state">
          <img src={NoCCNDay} alt="" className="stall-centered-state-image" />

          <h1>No CCN Day available</h1>

          <p>
            There is currently no active CCN Day, so stall applications are not
            open at the moment.
          </p>
        </section>
      )}

      {stallPageState === stallPageStates.CANNOT_APPLY && (
        <>
          <section className="stall-event-hero">
            <div className="stall-event-image-wrapper">
              <img src={CCNDAYTP} alt="BRUH"/>
            </div>

            <div className="stall-event-content">
              <span className="stall-section-eyebrow">Active CCN Day</span>

              <h1>{mockCCNDay.CCNName}</h1>

              <p>{mockCCNDay.CCNDescription}</p>

              <div className="stall-event-date-grid">
                <div>
                  <span>CCN starts</span>
                  <strong>{formatDateTime(mockCCNDay.StartDateTime)}</strong>
                </div>

                <div>
                  <span>CCN ends</span>
                  <strong>{formatDateTime(mockCCNDay.EndDateTime)}</strong>
                </div>

                <div>
                  <span>Registration opens</span>
                  <strong>
                    {formatDateTime(mockCCNDay.StallRegistrationStartDateTime)}
                  </strong>
                </div>

                <div>
                  <span>Registration closes</span>
                  <strong>
                    {formatDateTime(mockCCNDay.StallRegistrationEndDateTime)}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <section className="stall-restriction-card">
            <img
              className="stall-centered-state-image"
              src={NoCCNDay}
              alt=""
            ></img>
            <h2>You are unable to create a stall application</h2>

            <p>
              A CCN Day is currently active, but staff accounts must be
              whitelisted by the organiser before they can register a stall.
              Please contact the organiser if you believe you should have
              access.
            </p>
          </section>
        </>
      )}

      {stallPageState === stallPageStates.CAN_APPLY && (
        <>
          <section className="stall-event-hero">
            <div className="stall-event-image-wrapper">
              <img src={CCNDAYTP} alt={mockCCNDay.CCNName} />
            </div>

            <div className="stall-event-content">
              <span className="stall-section-eyebrow">Active CCN Day</span>

              <h1>{mockCCNDay.CCNName}</h1>

              <p>{mockCCNDay.CCNDescription}</p>

              <div className="stall-event-date-grid">
                <div>
                  <span>CCN starts</span>
                  <strong>{formatDateTime(mockCCNDay.StartDateTime)}</strong>
                </div>

                <div>
                  <span>CCN ends</span>
                  <strong>{formatDateTime(mockCCNDay.EndDateTime)}</strong>
                </div>

                <div>
                  <span>Registration opens</span>
                  <strong>
                    {formatDateTime(mockCCNDay.StallRegistrationStartDateTime)}
                  </strong>
                </div>

                <div>
                  <span>Registration closes</span>
                  <strong>
                    {formatDateTime(mockCCNDay.StallRegistrationEndDateTime)}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <section className="stall-application-card">
            <div className="stall-section-heading">
              <span className="stall-section-eyebrow">Stall application</span>

              <h2>Register your stall</h2>

              <p>
                Submit your stall details for organiser review. Location and
                stall school will be assigned by the organiser after approval.
              </p>
            </div>

            <form
              className="stall-application-form"
              onSubmit={handleSubmitStallApplication}
            >
              <label className="stall-form-field">
                <span>Stall name</span>
                <input
                  type="text"
                  name="StallName"
                  placeholder="Stall Name"
                  value={stallForm.StallName}
                  onChange={handleFormChange}
                />
              </label>

              <label className="stall-form-field">
                <span>Stall type</span>
                <select
                  name="stallType"
                  value={stallForm.stallType}
                  onChange={handleFormChange}
                >
                  {stallTypeOptions.map((stallType) => (
                    <option value={stallType} key={stallType}>
                      {stallType}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stall-form-field full">
                <span>Stall image URL</span>
                <input
                  type="text"
                  name="StallImage"
                  placeholder="Paste an image URL for your stall"
                  value={stallForm.StallImage}
                  onChange={handleFormChange}
                />
              </label>

              <label className="stall-form-field full">
                <span>Stall description</span>
                <textarea
                  name="StallDescription"
                  placeholder="Describe what your stall is selling or offering..."
                  value={stallForm.StallDescription}
                  onChange={handleFormChange}
                  rows="5"
                />
              </label>

              <label className="stall-checkbox-field">
                <input
                  type="checkbox"
                  name="NeedElectricalPort"
                  checked={stallForm.NeedElectricalPort}
                  onChange={handleCheckboxChange}
                />

                <span>I need an electrical port for this stall.</span>
              </label>

              <div className="stall-form-actions">
                <button type="submit">Submit stall application</button>
              </div>
            </form>
          </section>
        </>
      )}

      {stallPageState === stallPageStates.HAS_STALL && (
        <>
          <div className="stall-owner-action-bar">
            <div>
              <h1>{ownedStall.StallName}</h1>
            </div>

            <div className="stall-owner-actions">
              <button
                type="button"
                className="stall-primary-button"
                onClick={handleWithdrawStallPayments}
              >
                Withdraw
              </button>

              <button
                type="button"
                className="stall-secondary-button"
                onClick={openEditStallModal}
              >
                Edit stall
              </button>

              <button
                type="button"
                className="stall-danger-button"
                onClick={openDeleteStallModal}
              >
                Delete stall
              </button>
            </div>
          </div>

          <section className="stall-owned-card">
            <div className="stall-owned-image-wrapper">
              <img src={ownedStall.StallImage} alt={ownedStall.StallName} />
            </div>

            <div className="stall-owned-content">
              <div className="stall-owned-pills">
                <span>{ownedStall.stallType}</span>
                <span>{ownedStall.StallSchool}</span>
                <span>{ownedStall.stallStatus}</span>
              </div>

              <h2>{ownedStall.StallName}</h2>

              <p>{ownedStall.StallDescription}</p>

              <div className="stall-owned-meta-grid">
                <div>
                  <span>Location</span>
                  <strong>{ownedStall.StallLocation}</strong>
                </div>

                <div>
                  <span>Electrical port</span>
                  <strong>
                    {ownedStall.NeedElectricalPort ? "Needed" : "Not needed"}
                  </strong>
                </div>

                <div>
                  <span>Owner wallet</span>
                  <strong title={ownedStall.StallOwnerWallet}>
                    {formatWalletAddress(ownedStall.StallOwnerWallet)}
                  </strong>
                </div>

                <div>
                  <span>Withdrawal allowed</span>
                  <strong>{ownedStall.AllowedWithdrawal ? "Yes" : "No"}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="stall-products-section">
            <div className="stall-products-heading">
              <div>
                <span className="stall-section-eyebrow">Products</span>
                <h2>Stall products</h2>
              </div>

              <span>{products.length} products</span>
            </div>

            <div className="stall-product-grid">
              {products.map((product) => (
                <article className="stall-product-card" key={product.ProductID}>
                  <div className="stall-product-image-wrapper">
                    <img
                      src={product.ProductImage}
                      alt={product.ProductName}
                      loading="lazy"
                    />

                    <div className="stall-product-card-actions">
                      <button
                        type="button"
                        className="stall-product-edit-button"
                        onClick={() => openEditProductModal(product)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="stall-product-delete-button"
                        onClick={() => openDeleteProductModal(product)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="stall-product-content">
                    <div className="stall-product-status-row">
                      <span>{product.productStatus}</span>
                      <strong>{formatWeiToEth(product.ProductPrice)}</strong>
                    </div>

                    <h3>{product.ProductName}</h3>

                    <p>{product.ProductDescription}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <button
            type="button"
            className="stall-floating-add-product"
            aria-label="Add product"
            onClick={openCreateProductModal}
          >
            <img src={AddProduct} alt="" />
          </button>
        </>
      )}
      {activeModal === "editStall" && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card">
            <div className="stall-modal-heading">
              <span>Edit stall</span>
              <h2>Update stall status</h2>
              <p>
                You can only change whether your approved stall is open or
                closed.
              </p>
            </div>

            <form
              onSubmit={handleUpdateStallStatus}
              className="stall-modal-form"
            >
              <label className="stall-form-field full">
                <span>Stall status</span>
                <select
                  value={stallStatusForm}
                  onChange={(event) => setStallStatusForm(event.target.value)}
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </label>

              <div className="stall-modal-actions">
                <button
                  type="button"
                  className="stall-modal-cancel-button"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button type="submit" className="stall-modal-save-button">
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "createProduct" && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card wide">
            <div className="stall-modal-heading">
              <span>Create product</span>
              <h2>Add a new product</h2>
            </div>

            <form onSubmit={handleCreateProduct} className="stall-modal-form">
              {/* <label className="stall-form-field">
                <span>Stall ID</span>
                <input type="text" value={ownedStall.StallID} disabled />
              </label> */}

              <label className="stall-form-field">
                <span>Product price in wei</span>
                <input
                  type="text"
                  name="ProductPrice"
                  placeholder="Example: 5000000000000000"
                  value={productForm.ProductPrice}
                  onChange={handleProductFormChange}
                  required
                />
              </label>

              <label className="stall-form-field">
                <span>Product status</span>
                <select
                  name="productStatus"
                  value={productForm.productStatus}
                  onChange={handleProductFormChange}
                  required
                >
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </label>

              <label className="stall-form-field full">
                <span>Product name</span>
                <input
                  type="text"
                  name="ProductName"
                  placeholder="Example: Chocolate Brownie"
                  value={productForm.ProductName}
                  onChange={handleProductFormChange}
                  required
                />
              </label>

              <label className="stall-form-field full">
                <span>Product image URL</span>
                <input
                  type="text"
                  name="ProductImage"
                  placeholder="Paste an image URL for your product"
                  value={productForm.ProductImage}
                  onChange={handleProductFormChange}
                  required
                />
              </label>

              <label className="stall-form-field full">
                <span>Product description</span>
                <textarea
                  name="ProductDescription"
                  rows="5"
                  placeholder="Describe your product..."
                  value={productForm.ProductDescription}
                  onChange={handleProductFormChange}
                  required
                />
              </label>

              <div className="stall-modal-actions">
                <button
                  type="button"
                  className="stall-modal-cancel-button"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button type="submit" className="stall-modal-save-button">
                  Create product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "editProduct" && selectedProduct && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card wide">
            <div className="stall-modal-heading">
              <span>Edit product</span>
              <h2>Update product details</h2>
            </div>

            <form onSubmit={handleUpdateProduct} className="stall-modal-form">
              <label className="stall-form-field">
                <span>Product name</span>
                <input
                  type="text"
                  name="ProductName"
                  value={productForm.ProductName}
                  onChange={handleProductFormChange}
                />
              </label>

              <label className="stall-form-field">
                <span>Product status</span>
                <select
                  name="productStatus"
                  value={productForm.productStatus}
                  onChange={handleProductFormChange}
                >
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </label>

              <label className="stall-form-field">
                <span>Product price in wei</span>
                <input
                  type="text"
                  name="ProductPrice"
                  value={productForm.ProductPrice}
                  onChange={handleProductFormChange}
                />
              </label>

              <label className="stall-form-field full">
                <span>Product image URL</span>
                <input
                  type="text"
                  name="ProductImage"
                  value={productForm.ProductImage}
                  onChange={handleProductFormChange}
                />
              </label>

              <label className="stall-form-field full">
                <span>Product description</span>
                <textarea
                  name="ProductDescription"
                  rows="5"
                  value={productForm.ProductDescription}
                  onChange={handleProductFormChange}
                />
              </label>

              <div className="stall-modal-actions">
                <button
                  type="button"
                  className="stall-modal-cancel-button"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button type="submit" className="stall-modal-save-button">
                  Save product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "deleteStall" && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card confirm">
            <div className="stall-modal-heading">
              <span>Delete stall</span>
              <h2>Are you sure?</h2>
              <p>
                This is a confirmation popup before deleting your stall. In the
                real blockchain flow, this will call DeleteMyStall.
              </p>
            </div>

            <div className="stall-modal-actions">
              <button
                type="button"
                className="stall-modal-cancel-button"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="stall-modal-delete-button"
                onClick={handleConfirmDeleteStall}
              >
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "deleteProduct" && selectedProduct && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card confirm">
            <div className="stall-modal-heading">
              <span>Delete product</span>
              <h2>Delete {selectedProduct.ProductName}?</h2>
              <p>
                This product will be removed from the mock product list. In the
                real blockchain flow, this will call DeleteProduct.
              </p>
            </div>

            <div className="stall-modal-actions">
              <button
                type="button"
                className="stall-modal-cancel-button"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="stall-modal-delete-button"
                onClick={handleConfirmDeleteProduct}
              >
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "success" && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card confirm">
            <div className="stall-modal-heading success">
              <span>Success</span>
              <h2>{successMessage}</h2>
              <p>Your mock UI state has been updated successfully.</p>
            </div>

            <div className="stall-modal-actions">
              <button
                type="button"
                className="stall-modal-save-button"
                onClick={closeModal}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stall;
