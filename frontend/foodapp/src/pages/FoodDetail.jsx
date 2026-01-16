import React, { useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import StarRating from '../components/StarRating';
import FoodItem from '../components/FoodItem';

const FoodDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { food_list, cartItems, addToCart, removeFromCart, url, addToRecentlyViewed } = useContext(StoreContext);
  

  const item = food_list.find(item => item._id === id);

  useEffect(() => {
    if (item) {
      addToRecentlyViewed(item._id);
    }
  }, [item, addToRecentlyViewed]);

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Item not found</h1>
          <button
            onClick={() => navigate('/')}
            className="bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-all duration-300"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const similarItems = food_list.filter(food => food.category === item.category && food._id !== id).slice(0, 8);

 

  const handleBuyNow = () => {
    for (let i = 0; i < cartItems.length; i++) {
      addToCart(item._id);
    }
    navigate('/cart');
  };

  const mockDetails = {
    ingredients: ['Fresh vegetables', 'Premium spices', 'Natural oils', 'Herbs'],
    nutritionalInfo: {
      calories: '250 kcal',
      protein: '15g',
      carbs: '30g',
      fat: '8g'
    },
    allergens: ['None'],
    preparation: 'Ready to eat'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 bg-white/80 backdrop-blur-sm text-gray-700 px-4 py-2 rounded-xl hover:bg-white/90 transition-all duration-300 shadow-sm"
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Back
        </button>

        {/* Product Info - All in One Container */}
        <div className="max-w-6xl mx-auto bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 mb-12 hover:shadow-3xl transition-shadow duration-500">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Main Image */}
            <div className="w-full md:w-96 h-64 md:h-80 rounded-xl overflow-hidden shadow-lg">
              <img
                src={`${url}/images/${item.image}`}
                alt={item.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Product Details */}
            <div className="space-y-6 flex-1">
            {/* Basic Info */}
            <div>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mb-2 inline-block">
                {item.category || 'Food'}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">{item.name}</h1>
              <div className="flex items-center mb-4">
                <StarRating rating={item.rating || 4.5} />
                <span className="ml-2 text-gray-600">({item.rating || 4.5})</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-green-600 mb-4">KSh {item.price}</p>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                <i className="fas fa-check-circle mr-1"></i>
                In Stock
              </span>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                <i className="fas fa-info-circle mr-2 text-green-600"></i>
                Description
              </h3>
              <p className="text-gray-600 leading-relaxed text-base md:text-lg">{item.description}</p>
            </div>

            {/* Quantity and Add to Cart */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-2xl shadow-inner">
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-semibold text-gray-700">Quantity:</span>
                <div className="flex items-center bg-white rounded-full p-1 shadow-sm">
                  <button
                    onClick={() => removeFromCart(item._id)}
                    className="w-10 h-10 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-300 hover:scale-110 flex items-center justify-center"
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <span className="w-12 text-center font-semibold text-lg">{cartItems[item._id] || 0}</span>
                  <button
                    onClick={ () => addToCart(item._id) }
                    className="w-10 h-10 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all duration-300 hover:scale-110 flex items-center justify-center"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
                <p className="text-lg font-semibold text-gray-700">
                  Total: KSh {item.price * (cartItems[item._id] || 0)}
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => addToCart(item._id)}
                  className="flex-1 bg-green-500 text-white py-4 px-6 rounded-xl hover:bg-green-600 transition-all duration-300 hover:scale-105 font-semibold shadow-lg flex items-center justify-center text-lg"
                >
                  <i className="fas fa-cart-plus mr-2"></i>
                  Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 bg-orange-500 text-white py-4 px-6 rounded-xl hover:bg-orange-600 transition-all duration-300 hover:scale-105 font-semibold shadow-lg flex items-center justify-center text-lg"
                >
                  <i className="fas fa-bolt mr-2"></i>
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>



        {/* Details */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <i className="fas fa-list mr-2 text-green-600"></i>
            Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Ingredients</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                {mockDetails.ingredients.map((ing, index) => (
                  <li key={index}>{ing}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Nutritional Information</h3>
              <div className="space-y-1 text-gray-600">
                <p>Calories: {mockDetails.nutritionalInfo.calories}</p>
                <p>Protein: {mockDetails.nutritionalInfo.protein}</p>
                <p>Carbs: {mockDetails.nutritionalInfo.carbs}</p>
                <p>Fat: {mockDetails.nutritionalInfo.fat}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Allergens</h3>
              <p className="text-gray-600">{mockDetails.allergens.join(', ')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Preparation</h3>
              <p className="text-gray-600">{mockDetails.preparation}</p>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <i className="fas fa-truck mr-2 text-green-600"></i>
            Delivery Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-600">
            <div className="flex items-center">
              <i className="fas fa-clock mr-2 text-green-600"></i>
              <span>Delivery within 30-45 minutes</span>
            </div>
            <div className="flex items-center">
              <i className="fas fa-map-marker-alt mr-2 text-green-600"></i>
              <span>Free delivery over KSh 500</span>
            </div>
            <div className="flex items-center">
              <i className="fas fa-shield-alt mr-2 text-green-600"></i>
              <span>Secure packaging guaranteed</span>
            </div>
          </div>
        </div>

        {/* Similar Items */}
        {similarItems.length > 0 && (
          <div className=" p-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 flex items-center">
              <i className="fas fa-th-large mr-2 text-green-600"></i>
              Similar Items
            </h2>
            <div className="flex overflow-x-auto space-x-4 pb-4">
              {similarItems.map(item => (
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
      </div>
    </div>
    </div>
  );
}


export default FoodDetail;
