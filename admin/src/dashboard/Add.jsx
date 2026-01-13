import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from "react-router-dom";
import.meta.env.VITE_BACKEND_URL;

const Add = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [, setExistingImage] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const url = import.meta.env.VITE_BACKEND_URL;
  
  const [data, setData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Fruits",
  });

  const [loading, setLoading] = useState(false);

  // Fetch single food when editing
  useEffect(() => {
    if (!id) return;



    const fetchFood = async () => {

      const token = localStorage.getItem("adminToken");

      if (!token) {
        // No token, redirect to login
        return toast.error("Not authorized .please login");
      }
      try {
        const response = await axios.get(url + `/api/food/${id}` ,{
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          const food = response.data.data;

          setData({
            name: food.name,
            description: food.description,
            price: food.price,
            category: food.category,
          });

          setExistingImage(food.image);
          setPreview(url + `/images/${food.image}`, {
            headers: {
              Authorization: `Bearer ${token}`
          }});
        } else {
          toast.error(response.data.message);
        }
      } catch (error) {
        toast.error("Failed to fetch food item");
      }
    };

    fetchFood();
  }, [id]);

  // Image preview
  useEffect(() => {
    if (!image) return;
    const objectUrl = URL.createObjectURL(image);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setData({ ...data, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData();

    if (image) {
      formData.append("image", image);  
    }

    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("price", Number(data.price));
    formData.append("category", data.category);

    try {
      let response;
       
      const token = localStorage.getItem("adminToken");

      if (!token) {
        // No token, redirect to login
        return toast.error("Not authorized .please login");
      }
      if (id) {
        response = await axios.put(
          url + `/api/food/update/${id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
           } }
        );
      } else {
        response = await axios.post(
          url + `/api/food/add`,
          formData,
          { headers: { "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
           } }
        );
      }

      if (response.data.success) {
        toast.success(response.data.message);
        navigate("/admin/list");
      } else {
        toast.error(response.data.message);
      }

    } catch (_) {
      toast.error("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full p-4 md:p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {id ? "Edit Product" : "Add New Product"}
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            {id ? "Update product information and image" : "Create a new delicious product for your store"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
          <div className="p-8 md:p-10">
            {/* Image Upload Section */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Product Image</h2>
              </div>

              <label className="cursor-pointer group block">
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 group-hover:scale-[1.02] bg-gray-50">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    {preview ? (
                      <img
                        src={preview}
                        className="w-20 h-20 object-cover rounded-xl"
                        alt="preview"
                      />
                    ) : (
                      <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-700 mb-1">
                      {id ? "Change Product Image" : "Upload Product Image"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {id ? "Click to select a new image" : "Click to browse or drag and drop"}
                    </p>
                  </div>

                  <input
                    type="file"
                    hidden
                    onChange={(e) => setImage(e.target.files[0])}
                    required={!id}
                    accept="image/*"
                  />
                </div>
              </label>
            </div>

            {/* Form Fields */}
            <div className="space-y-8">
              {/* Product Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Product Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={data.name}
                  required
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-gray-900 placeholder-gray-400"
                  placeholder="Enter product name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Description
                </label>
                <textarea
                  name="description"
                  rows="5"
                  required
                  value={data.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-gray-900 placeholder-gray-400 resize-none"
                  placeholder="Describe your product in detail"
                />
              </div>

              {/* Category and Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Category
                  </label>
                  <select
                    name="category"
                    value={data.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-200 text-gray-900 bg-white max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                    required
                
                  >
                    <option value="Fruits">🍎 Fruits</option>
                    <option value="Vegetables">🥕 Vegetables</option>
                    <option value="Meat and Seafood">🐟 Meat and Seafood</option>
                    <option value="Snacks and Sweets">🍬 Snacks and Sweets</option>
                    <option value="Beverages">🥤 Beverages</option>
                    <option value="Bakery">🍞 Bakery</option>
                    <option value="Nuts and Dried Fruits">🥜 Nuts and Dried Fruits</option>
                    <option value="Packaged Foods">📦 Packaged Foods</option>
                    <option value="Dairy and Eggs">🥛 Dairy and Eggs</option>
                    <option value="Frozen Foods">🧊 Frozen Foods</option>
                    <option value="Spices and Condiments">🌶️ Spices and Condiments</option>
                    <option value="Cooking Essentials">👨‍🍳 Cooking Essentials</option>
                    <option value="Organic and Health Foods">🌱 Organic and Health Foods</option>
                    <option value="Grains and Cereals">🌾 Grains and Cereals</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Price (Ksh)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={data.price}
                    required
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-10 pt-8 border-t border-gray-100">
              <button
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {id ? "Updating Product..." : "Adding Product..."}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {id ? "Update Product" : "Add Product"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Add;
