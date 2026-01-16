import React, { useState } from 'react'
import Navbar from './components/Navbar'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Cart from './pages/Cart'
import PlaceOrder from './pages/PlaceOrder'
import FoodDetail from './pages/FoodDetail'
import Footer from './components/Footer'
import LoginForm from './components/LoginForm'
import { ToastContainer } from 'react-toastify';
import UserInfo from './components/UserInfo'
import Scroll from './components/Scroll'
import ScrollTop from './components/ScrollTop'

const App = () => {
  const [showLogin, setShowLogin] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [category, setCategory] = useState("All")
  const [showPlaceOrder, setShowPlaceOrder] = useState(false)


  return (
    <div className="min-h-screen bg-white">
      <ToastContainer />
      <ScrollTop/>
      {showLogin && <LoginForm setShowLogin={setShowLogin} />}
      {showPlaceOrder && <PlaceOrder setShowPlaceOrder={setShowPlaceOrder} />}
      {showSidebar && <UserInfo setShowSidebar={setShowSidebar} />}

      <Navbar
        setShowLogin={setShowLogin}
        setShowSidebar={setShowSidebar}
        setCategory={setCategory}
        category={category}
      />

      <Routes>
        <Route
          path="/"
          element={
            <Home
              category={category}
              setCategory={setCategory}
            />
          }
        />
        <Route
          path="/cart"
          element={<Cart setShowPlaceOrder={setShowPlaceOrder} />}
        />
        <Route
          path="/food/:id"
          element={<FoodDetail />}
        />
        <Route path='/login' element={<LoginForm setShowLogin={setShowLogin} />}/>
      </Routes>

      <Footer />
    </div>
  )
}

export default App
