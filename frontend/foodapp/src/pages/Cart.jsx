import { useContext, useState, useEffect } from "react";
import { StoreContext } from "../context/StoreContext";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import FoodItem from "../components/FoodItem";

const Cart = ({ setShowPlaceOrder }) => {
  const { cartItems, removeFromCart, food_list, addToCart, url, user, recentlyViewed } = useContext(StoreContext);
  const [loading, setLoading] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [formData, setFormData] = useState({
    country: "Kenya",
    county: "",
    city: "",
    email: ""
  });
  const [feeResult, setFeeResult] = useState(null);
  const [deliveryCalculated, setDeliveryCalculated] = useState(false);

  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [phoneInput , setPhoneInput] = useState(user?.phone || "");
  const [bounce, setBounce] = useState(false);

  const getStockStatus = (itemId) => {
    const stock = Math.floor(Math.random() * 50) + 1; // Mock stock data
    if (stock > 20) return { status: 'In Stock', color: 'green' };
    if (stock > 5) return { status: 'Few in Stock', color: 'yellow' };
    return { status: 'Out of Stock', color: 'red' };
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.country || !formData.county || !formData.city || !formData.email) {
      toast.error("Please fill in all delivery information");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${url}/api/delivery/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "Something went wrong");
      } else {
        setFeeResult(data.data);
        setDeliveryCalculated(true);
        setShowDeliveryModal(false);
        toast.success("Delivery fee calculated successfully!");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  }

  // Auto-calculate delivery fee when all fields are filled
  useEffect(() => {
    if (formData.country && formData.county && formData.city && formData.email && !deliveryCalculated) {
      handleSubmit({ preventDefault: () => {} });
    }
  }, [formData, deliveryCalculated, handleSubmit]);

 
  // Calculate total cart price
  const totalPrice = food_list.reduce((acc, item) => {
    if (cartItems[item._id] > 0) {
      return acc + item.price * cartItems[item._id];
    }
    return acc;
  }, 0);

  // Get recently viewed items
  const recentlyViewedItems = recentlyViewed.map(id => food_list.find(item => item._id === id)).filter(Boolean);

  // Get recommended items based on recently viewed categories or default popular items
  const getRecommendedItems = () => {
    const viewedCategories = recentlyViewed.map(id => food_list.find(f => f._id === id)?.category).filter(Boolean);
    let recommended;
    if (viewedCategories.length > 0) {
      recommended = food_list.filter(f => viewedCategories.includes(f.category) && !recentlyViewed.includes(f._id));
    } else {
      // If no items viewed, show first 8 items as recommendations
      recommended = food_list.slice(0, 8);
    }
    return [...new Set(recommended)].slice(0, 8);
  };

  const recommendedItems = getRecommendedItems();


  const bouncing = () => {
    if (!bounce) {
      setBounce(true);
      setTimeout(() => {
        setBounce(false);
      }, 300);
    }
  }

  const handlePayAfterDelivery = async () => {
    const token = localStorage.getItem("token");

    if(!token) {
      toast.error("Please login to place an order");
      return;
    }

    if (!deliveryCalculated) {
      toast.error("Please calculate delivery fee first");
      return;
    }

    if (Object.keys(cartItems).length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!user || (!user._id && !user.id)) {
      toast.error("Please login to place an order");
      return;
    }

    setLoading(true);

    try {
      const totalAmount = totalPrice + Number(feeResult?.fee ?? 0);

      const response = await fetch(`${url}/api/orders/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          phone: phoneInput,
          amount: totalAmount,
          userId: user._id || user.id,
          deliveryAddress: {
            street: formData.city,
            city: formData.city,
            county: formData.county,
            coordinates: { lat: 0, lng: 0 }
          },
          deliveryInfo: formData,
          notes: "Pay after delivery order",
          paymentMethod: "Pay after delivery"
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Order placed successfully! Pay after delivery.");
        window.location.reload();
      } else {
        toast.error(data.message || "Failed to place order");
      }
    } catch (error) {
      console.error("Pay after delivery error:", error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handlePayAfterDelivery(e);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Shopping Cart</h1>
          <p className="text-gray-600">Review your delicious selections</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
                <h2 className="text-2xl font-bold flex items-center">
                  <i className="fas fa-shopping-cart mr-3"></i>
                  Your Items
                </h2>
              </div>

              {totalPrice === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4 animate-bounce">🛒</div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">Your cart is empty</h3>
                  <p className="text-gray-500 mb-6">Time to fill it with amazing food!</p>
                  <Link to="/">
                    <button className="bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-all duration-300 hover:scale-105 shadow-lg">
                      <i className="fas fa-utensils mr-2"></i>
                      Browse Menu
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="p-6">
                  <div className="space-y-4 mb-6 max-h-80 md:max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-green-300 scrollbar-track-gray-100">
                    {food_list.map((item) =>
                      cartItems[item._id] > 0 ? (
                        <div key={item._id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 bg-gray-50/80 backdrop-blur-sm rounded-xl hover:bg-white/50 transition-all duration-300 hover:shadow-lg border border-gray-100/50 space-y-4 md:space-y-0">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 flex-1 w-full md:w-auto">
                            <img
                              src={`${url}/images/${item.image}`}
                              alt={item.name}
                              className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl shadow-sm"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-800 text-base md:text-lg">{item.name}</h3>
                              <p className="text-gray-600 text-xs md:text-sm mt-1 line-clamp-2">{item.description || 'Delicious and fresh food item.'}</p>
                              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mt-2">
                                <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium w-fit ${
                                  getStockStatus(item._id).color === 'green' ? 'bg-green-100 text-green-800' :
                                  getStockStatus(item._id).color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  <i className={`fas fa-circle mr-1 text-xs ${
                                    getStockStatus(item._id).color === 'green' ? 'text-green-500' :
                                    getStockStatus(item._id).color === 'yellow' ? 'text-yellow-500' :
                                    'text-red-500'
                                  }`}></i>
                                  {getStockStatus(item._id).status}
                                </span>
                                <p className="text-green-600 font-bold text-base md:text-lg">KSh {item.price}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col md:flex-col items-start justify-between md:justify-end space-y-4 w-full md:w-auto">
                            <div className="flex items-center space-x-2 bg-white rounded-full p-1 shadow-sm">
                              <button
                                onClick={() => removeFromCart(item._id)}
                                className="w-7 h-7 md:w-8 md:h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-300 hover:scale-110 flex items-center justify-center"
                              >
                                <i className="fas fa-minus text-xs"></i>
                              </button>
                              <span className="font-semibold w-6 md:w-8 text-center text-sm md:text-base">{cartItems[item._id]}</span>
                              <button
                                onClick={() => addToCart(item._id)}
                                className="w-7 h-7 md:w-8 md:h-8 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all duration-300 hover:scale-110 flex items-center justify-center"
                              >
                                <i className="fas fa-plus text-xs"></i>
                              </button>
                            </div>
                            <div className="text-right md:text-right">
                              <p className="font-bold text-lg md:text-xl text-gray-800">
                                KSh {(item.price * cartItems[item._id]).toFixed(2)}
                              </p>
                              <button
                                onClick={() => {
                                  for (let i = 0; i < cartItems[item._id]; i++) {
                                    removeFromCart(item._id);
                                  }
                                }}
                                className="mt-1 md:mt-2 text-red-500 hover:text-red-700 transition-colors text-xs md:text-sm flex items-center hover:scale-105"
                              >
                                <i className="fas fa-trash mr-1"></i>
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>

                  <button
                    onClick={() => setShowDeliveryModal(true)}
                    className="w-full bg-blue-500 text-white py-4 px-6 rounded-xl hover:bg-blue-600 transition-all duration-300 hover:scale-105 font-semibold shadow-lg flex items-center justify-center"
                  >
                    <i className="fas fa-map-marker-alt mr-2"></i>
                    {deliveryCalculated ? 'Update Delivery Info' : 'Enter Delivery Information'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Section */}
          <div className="space-y-6">

               {feeResult && (
              <div className="bg-blue-50/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50">
                <h3 className="font-semibold mb-3 flex items-center">
                  <i className="fas fa-info-circle mr-2 text-blue-600"></i>
                  Delivery Details
                </h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Fee:</span>
                    <span className="font-bold text-green-600">KSh {feeResult.fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Distance:</span>
                    <span className="font-bold">{feeResult.distanceKm} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tier:</span>
                    <span className="font-bold">{feeResult.tier}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <i className="fas fa-receipt mr-2 text-green-600"></i>
                Order Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <i className="fas fa-shopping-bag mr-2 text-gray-500"></i>
                    Subtotal
                  </span>
                  <span className="font-semibold">KSh {totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <i className="fas fa-truck mr-2 text-gray-500"></i>
                    Delivery Fee
                  </span>
                  <span className="font-semibold">KSh {feeResult?.fee || 0}</span>
                </div>
                <hr className="my-4 border-gray-200" />
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total</span>
                  <span className="text-green-600">KSh {(totalPrice + (feeResult?.fee || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>


            <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
              <h3 className="font-semibold mb-3 flex items-center">
                <i className="fas fa-tags mr-2 text-green-600"></i>
                Promo Code
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code"
                  className="flex-1 p-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-all duration-300 hover:scale-105">
                  Apply
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (!deliveryCalculated) {
                    toast.error("Please enter delivery information first");
                    return;
                  }
                  setShowPlaceOrder(true);
                }}
                className="w-full bg-green-500 text-white py-4 px-6 rounded-xl hover:bg-green-600 transition-all duration-300 hover:scale-105 font-semibold shadow-lg flex items-center justify-center disabled:opacity-50"
                disabled={!deliveryCalculated}
              >
                <i className="fas fa-credit-card mr-2"></i>
                Proceed to Payment
              </button>

              <button
                onClick={() => {
                  if (!deliveryCalculated) {
                    toast.error("Please calculate delivery fee first");
                    return;
                  }
                  if (!phoneInput && !user?.phone) {
                    setShowPhonePrompt(true);
                    return;
                  }
                  handlePayAfterDelivery();
                }}
                disabled={loading || !deliveryCalculated}
                className="w-full bg-blue-500 text-white py-4 px-6 rounded-xl hover:bg-blue-600 transition-all duration-300 hover:scale-105 font-semibold shadow-lg flex items-center justify-center disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Placing Order...
                  </>
                ) : (
                  <>
                    <i className="fas fa-hand-holding-usd mr-2"></i>
                    Pay After Delivery
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Recently Viewed Items */}
        {recentlyViewedItems.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 mb-8 mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <i className="fas fa-history mr-2 text-green-600"></i>
              Recently Viewed
            </h2>
            <div className="flex overflow-x-auto space-x-4 pb-4">
              {recentlyViewedItems.slice(0, 8).map(item => (
                <div key={item._id} className="flex-shrink-0 w-64">
                  <FoodItem
                    id={item._id}
                    name={item.name}
                    price={item.price}
                    description={item.description}
                    image={item.image}
                    rating={item.rating}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Items */}
        {recommendedItems.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 mb-8 ">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <i className="fas fa-thumbs-up mr-2 text-blue-600"></i>
              Customers Also Viewed
            </h2>
            <div className="flex overflow-x-auto space-x-4 pb-4">
              {recommendedItems.slice(0, 8).map(item => (
                <div key={item._id} className="flex-shrink-0 w-64">
                  <FoodItem
                    id={item._id}
                    name={item.name}
                    price={item.price}
                    description={item.description}
                    image={item.image}
                    rating={item.rating}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delivery Modal */}
        {showDeliveryModal && (
          <>
            <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white/95 backdrop-blur-lg rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/20">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold flex items-center">
                    <i className="fas fa-truck mr-2 text-green-600"></i>
                    Delivery Information
                  </h2>
                  <button
                    onClick={() => setShowDeliveryModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl hover:scale-110 transition-transform"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center">
                      <i className="fas fa-globe mr-2 text-gray-500"></i>
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Kenya"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center">
                      <i className="fas fa-map mr-2 text-gray-500"></i>
                      County
                    </label>
                    <input
                      type="text"
                      name="county"
                      value={formData.county}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Nairobi"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center">
                      <i className="fas fa-city mr-2 text-gray-500"></i>
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Nairobi CBD"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center">
                      <i className="fas fa-envelope mr-2 text-gray-500"></i>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-500 text-white py-3 px-6 rounded-xl hover:bg-green-600 transition-all duration-300 hover:scale-105 font-semibold disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Calculating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-calculator mr-2"></i>
                        Calculate Delivery Fee
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Phone Prompt Modal */}
        {showPhonePrompt && (
          <>
            <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white/95 backdrop-blur-lg rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-white/20">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <i className="fas fa-phone mr-2 text-green-600"></i>
                  Enter Phone Number
                </h2>

                <input
                  type="tel"
                  placeholder="07xxxxxxxx"
                  onKeyDown={handleKeyDown}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:ring-2 focus:ring-green-500"
                />

                <div className="flex gap-3">
                  <button
                    className="flex-1 bg-gray-300 py-3 px-4 rounded-xl hover:bg-gray-400 transition-all duration-300"
                    onClick={() => setShowPhonePrompt(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 bg-green-500 text-white py-3 px-4 rounded-xl hover:bg-green-600 transition-all duration-300 hover:scale-105"
                    onClick={() => {
                      if (!phoneInput || phoneInput.replace(/\D/g, "").length < 9) {
                        toast.error("Enter valid Phone number");
                        return;
                      }
                      setShowPhonePrompt(false);
                      handlePayAfterDelivery();
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Cart;
