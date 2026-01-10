import React, { useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { StoreContext } from '../context/StoreContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaTimes, FaCreditCard, FaMapMarkerAlt, FaPhone, FaUser, FaEnvelope } from 'react-icons/fa';

const PlaceOrder = ({ setShowPlaceOrder, defaultAmount, deliveryFee = 0 }) => {
  const { cartItems, user, url, food_list } = useContext(StoreContext);
  const [loading, setLoading] = useState(false);

  // Phone state
  const initialPhone = user?.phone || "";
  const [phone, setPhone] = useState(initialPhone);

  // Amount state
  const [amount, setAmount] = useState(defaultAmount || 0);

  // Update amount if cart changes or defaultAmount changes
  useEffect(() => {
    const total = Object.entries(cartItems).reduce((sum, [itemId, qty]) => {
      const item = food_list?.find(f => f._id === itemId);
      if (!item) return sum;
      return sum + qty * item.price;
    }, 0);

    setAmount((total ?? 0) + (deliveryFee ?? 0));
  }, [cartItems, food_list, deliveryFee, defaultAmount]);

  const deliveryAddress = "Default Address"; // backend-required
  const notes = "";

  // --- Validation ---
  const validateOrder = () => {

    if (Object.keys(cartItems).length === 0) {
      toast.error("Your cart is empty");
      return false;
    }

    if (!phone || phone.replace(/\D/g, '').length < 9) {
      toast.error("Please enter a valid phone number");
      return false;
    }


    return true;
  };

  // --- Format phone number ---
  const formatPhoneNumber = (value) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('254')) return cleaned;
    if (cleaned.startsWith('0')) return '254' + cleaned.substring(1);
    if (cleaned.startsWith('7') || cleaned.startsWith('1')) return '254' + cleaned;
    return cleaned;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateOrder()) return;

    try {
      setLoading(true);

      const formattedPhone = formatPhoneNumber(phone || user.phone);

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("You must be logged in to place an order");
        setLoading(false);
        return;
      }
      const items = Object.entries(cartItems)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => {
        const item = food_list.find(f => f._id === itemId);
        return {
          foodId: itemId,
          name: item.name,
          price: item.price,
          quantity: qty
        };
      });

      const response = await axios.post(`${url}/api/orders/place`, {
        phone: formattedPhone,
        userId: user._id,
        address: deliveryAddress,
        deliveryAddress,
        notes,
        items: items,
        amount: amount,
        paymentMethod: "M-Pesa",

      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log("MPESA STK Response:", response.data);

      toast.success("M-Pesa payment initiated. Please complete the payment on your phone.");

      setShowPlaceOrder(false);

    } catch (error) {

      console.log("Payment Error:", error);
      toast.error("Error initiating M-Pesa payment. Try again.");

    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AnimatePresence>
        {/* Overlay */}
        <motion.div
          key="overlay"
          className='fixed inset-0  backdrop-blur-sm z-40'
          onClick={() => setShowPlaceOrder(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal */}
        <motion.div
          key="modal"
            className='fixed z-40 w-[90%] sm:w-[70%] md:w-[50%] lg:w-[40%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
           bg-white p-10 rounded-xl shadow-lg max-h-[90vh] overflow-y-auto scrollbar-hide'
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.4 }}
        >
          <form onSubmit={handleSubmit} className='flex flex-col items-center justify-center relative'>
            <h1 className='text-center font-bold text-xl sm:text-2xl mb-5 text-green-600'>M-Pesa Checkout</h1>

            {/* User Info */}
            <div className='w-full mb-4 p-4 bg-gray-100 rounded-lg'>
              <p><strong>Name:</strong> {user?.name}</p>
              <p><strong>Email:</strong> {user?.email}</p>
            </div>

            {/* Items */}
            <div className='w-full mb-4 p-4 bg-gray-100 rounded-lg'>
              <h2 className='font-bold mb-2 text-center'>Items you are paying for</h2>
              <ul>
                {Object.entries(cartItems)
                  .filter(([, qty]) => qty > 0)
                  .map(([itemId, qty]) => {
                    const item = food_list?.find(i => i._id === itemId);
                    if (!item) return null;
                    return (
                      <li key={itemId}>
                        {item.name} - Qty: {qty} - Ksh {(item.price * qty).toFixed(2)}
                      </li>
                    );
                  })}
              </ul>
            </div>

            {/* Delivery Fee */}
            <div className='w-full mb-2 flex justify-between p-2 bg-gray-200 rounded-lg'>
              <span className='font-bold'>Delivery Fee:</span>
              <span className='text-green-600 font-bold'>Ksh {deliveryFee ?? 0}</span>
            </div>

            {/* Total Amount */}
            <div className='w-full mb-4 flex justify-between p-2 bg-gray-200 rounded-lg'>
              <span className='font-bold'>Total:</span>
              <span className='text-green-600 font-bold'>Ksh {amount}</span>
            </div>

            {/* Phone input */}
            <input
              className='rounded-lg mb-4 p-3 outline-none focus:ring-2 ring-yellow-500 w-full text-sm sm:text-base bg-gray-200'
              type="tel"
              placeholder='Phone number'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

              <p className="text-xs text-center text-gray-600 mb-4">
               You will receive an M-Pesa payment prompt on the phone   number you entered above.
                 Please ensure the phone is on and has sufficient balance.
            </p>

            <button
              type='submit'
              disabled={loading}
              className='rounded-lg p-3 outline-none bg-green-500 w-full text-sm sm:text-base font-bold mb-3 hover:bg-green-700 duration-300'
            >
              {loading ? "Processing..." : "Pay with M-Pesa"}
            </button>

            <button
              type="button"
              onClick={() => setShowPlaceOrder(false)}
              className='rounded-lg p-3 outline-none bg-red-500 w-full text-sm sm:text-base font-bold hover:bg-red-700 duration-300'
            >
              Cancel
            </button>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PlaceOrder;
