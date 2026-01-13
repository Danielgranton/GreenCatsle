import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";


const Header = () => {
  const cards = [
    {
      id: 1,
      title: "Fresh Meals Delivered",
      desc: "Order from Green Castle and enjoy healthy, hot meals at your doorstep.",
      image: "/images/a.jpg",
    },
    {
      id: 2,
      title: "Fresh food from Our Kitchen",
      desc: "We deliver anywhere in Nairobi in record time — fresh, hot, and fast!",
      image: "/images/b.jpg",
    },
    {
      id: 3,
      title: "Affordable Housing",
      desc: "Get amazing deals and discounts every week on your favorite meals.",
      image: "/images/c.jpg",
    },
    {
      id: 4,
      title: "Fast Delivery On Time",
      desc: "We deliver anywhere in Nairobi and any other place in record time — fresh, hot, and fast!",
      image: "/images/deliver.jpg",
    },
  ];

  const [current, setCurrent] = useState(0);

  // Auto slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % cards.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [cards.length]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center  bg-white pt-5 px-5 ">
      <h1 className="text-green-600 font-bold text-4xl ">Welcome To Green Catsle Internatiol(GCI)</h1>
    <div className="relative flex items-center mt-5 justify-center h-[60vh] bg-gray-100 overflow-hidden w-full rounded-tl-4xl rounded-br-4xl shadow-lg ">
      <AnimatePresence mode="sync">
        <motion.div
          key={cards[current].id}
          initial={{ x: "100%", opacity: 1 }}
          animate={{ x: "0%", opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute w-[100%] h-[100%] rounded-3xl text-white  shadow-xl flex flex-col justify-center "
        >
          {/* image background */}
          <img
            src= {cards[current].image}
            alt={cards[current].title}
            className="absolute w-full h-full object-cover  inset-0 "
          />
            {/* overley */}
          <div className="absolute inset-0 bg-black/40"></div>

          {/* Animate text from bottom */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="text-center px-5 md:px-20 relative z-10 text-white"
          >
            <h1 className="text-4xl font-bold mb-3">{cards[current].title}</h1>
            <p className="text-lg">{cards[current].desc}</p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
   
  </div>
  );
};

export default Header;
