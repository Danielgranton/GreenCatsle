import React from 'react'
import Header from '../components/Header'
import AppDownload from '../components/AppDownload'
import MenuPage from '../components/MenuPage'

const Home = ({ category, setCategory }) => {
  return (
    <div className="min-h-screen">
      
      {/* Hero Section */}
      <section id="header">
        <Header />
      </section>

      {/* Menu Section */}
      <section id="menu" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              Our Delicious <span className="text-green-600">Menu</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our wide range of fresh fruits, organic vegetables, and healthy groceries.
              All delivered fresh to your doorstep.
            </p>
          </div>

          {/* 🔥 CATEGORY-SYNCED MENU */}
          <MenuPage
            category={category}
            setCategory={setCategory}
          />

        </div>
      </section>

      {/* App Download Section */}
      <section id="mobile" className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AppDownload />
        </div>
      </section>

    </div>
  )
}

export default Home
