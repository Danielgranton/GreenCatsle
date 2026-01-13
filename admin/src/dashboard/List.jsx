import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from "react-router-dom";
import.meta.env.VITE_BACKEND_URL;

const List = () => {
  const [list, setList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const url = import.meta.env.VITE_BACKEND_URL;

  const navigate = useNavigate();

  const fetchList = async () => {
    setLoading(true);
    try {
      const response = await axios.get( url + '/api/food/list');
      if (response.data.success) {
        setList(response.data.data);
        setFilteredList(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to fetch list');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id) => {
    try {
      console.log(id);
      const response = await axios.delete(url + `/api/food/delete/${id}`);
      if (response.data.success) {
        toast.success(response.data.message);
        await fetchList();
      } else {
        toast.error(response.data.message);
      }
    } catch (_) {
      toast.error('Failed to delete item');
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    let filtered = list.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'price') {
          aValue = parseFloat(aValue);
          bValue = parseFloat(bValue);
        } else {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredList(filtered);
    setSelectAll(false);
    setSelectedItems([]);
  }, [searchTerm, list, sortConfig]);

  // Add these inside the List component, above useEffect
const handleSelectAll = () => {
  if (selectAll) {
    setSelectedItems([]);
  } else {
    setSelectedItems(filteredList.map(item => item._id));
  }
  setSelectAll(!selectAll);
};

const handleSelectItem = (id) => {
  if (selectedItems.includes(id)) {
    setSelectedItems(selectedItems.filter(item => item !== id));
  } else {
    setSelectedItems([...selectedItems, id]);
  }
};

const handleSort = (key) => {
  let direction = 'asc';
  if (sortConfig.key === key && sortConfig.direction === 'asc') {
    direction = 'desc';
  }
  setSortConfig({ key, direction });
};

const handleBulkDelete = async () => {

  for (const id of selectedItems) {
    await deleteItem(id);
  }
  setSelectedItems([]);
};


  return (
    <div className="w-full">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">All Foods List</h1>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-96 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm"
            aria-label="Search foods"
          />
        </div>

        {/* Bulk Actions Bar */}
        {selectedItems.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-800">
                {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedItems([])}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Table Container */}
        {!loading && (
          <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-green-500 to-green-600 text-white text-sm md:text-base font-semibold">
                  <th className="py-4 px-3 md:px-6">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded border-white text-white focus:ring-white"
                      aria-label="Select all items"
                    />
                  </th>
                  <th className="py-4 px-3 md:px-6">Image</th>
                  <th
                    className="py-4 px-3 md:px-6 cursor-pointer hover:bg-green-700 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {sortConfig.key === 'name' && (
                        <svg className={`w-4 h-4 ${sortConfig.direction === 'asc' ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    className="py-4 px-3 md:px-6 cursor-pointer hover:bg-green-700 transition-colors"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                      {sortConfig.key === 'category' && (
                        <svg className={`w-4 h-4 ${sortConfig.direction === 'asc' ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-3 md:px-6">Description</th>
                  <th
                    className="py-4 px-3 md:px-6 cursor-pointer hover:bg-green-700 transition-colors"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Price</span>
                      {sortConfig.key === 'price' && (
                        <svg className={`w-4 h-4 ${sortConfig.direction === 'asc' ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-3 md:px-6 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredList.length === 0 && !loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
                        <p className="text-gray-500 mb-4">
                          {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first product.'}
                        </p>
                        {!searchTerm && (
                          <button
                            onClick={() => navigate('/admin/add')}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Product
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item, index) => (
                    <tr
                      key={item._id}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors ${
                        selectedItems.includes(item._id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <td className="py-4 px-3 md:px-6">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item._id)}
                          onChange={() => handleSelectItem(item._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Select ${item.name}`}
                        />
                      </td>
                      <td className="py-4 px-3 md:px-6">
                        <img
                          src={url + `/images/${item.image}`}
                          alt={item.name}
                          className="h-12 w-12 md:h-16 md:w-16 object-cover rounded-lg shadow-sm"
                        />
                      </td>

                      <td className="py-4 px-3 md:px-6 text-gray-900 font-medium text-sm md:text-base">
                        {item.name}
                      </td>

                      <td className="py-4 px-3 md:px-6 text-gray-600 text-sm md:text-base">
                        {item.category}
                      </td>

                      <td className="py-4 px-3 md:px-6 text-gray-600 text-sm md:text-base max-w-xs truncate">
                        {item.description}
                      </td>

                      <td className="py-4 px-3 md:px-6 text-gray-900 font-semibold text-sm md:text-base">
                        Ksh {item.price}
                      </td>

                      <td className="py-4 px-3 md:px-6 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => navigate(`/admin/add/${item._id}`)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                            aria-label={`Edit ${item.name}`}
                          >
                            <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>

                          <button
                            onClick={() => {
                              setItemToDelete(item);
                              setShowDeleteModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            aria-label={`Delete ${item.name}`}
                          >
                            <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex space-x-4">
                    <div className="h-12 w-12 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 w-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed top-1/3 inset-0  overflow-y-auto  z-50" onClick={() => setShowDeleteModal(false)}>
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-gray-200" onClick={(e) => e.stopPropagation()}>
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedItems.length > 0 ? 'Delete Selected Products' : 'Delete Product'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {selectedItems.length > 0
                    ? `Are you sure you want to delete ${selectedItems.length} selected product${selectedItems.length > 1 ? 's' : ''}? This action cannot be undone.`
                    : `Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`
                  }
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (selectedItems.length > 0) {
                        handleBulkDelete();
                      } else if (itemToDelete) {
                        deleteItem(itemToDelete._id);
                      }
                      setShowDeleteModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default List;
