import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NavBar: React.FC = () => {
  return (
    <motion.nav
      className="bg-primary text-white p-4"
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/home" className="text-xl font-bold">Plant Detection</Link>
        <div className="space-x-4">
          <Link to="/home" className="hover:underline">Home</Link>
          <Link to="/indoor" className="hover:underline">Indoor</Link>
          <Link to="/outdoor" className="hover:underline">Outdoor</Link>
          <Link to="/scan" className="hover:underline">Scan</Link>
          <Link to="/settings" className="hover:underline">Settings</Link>
        </div>
      </div>
    </motion.nav>
  );
};

export default NavBar;