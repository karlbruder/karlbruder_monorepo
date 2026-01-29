import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import { useEffect } from "react";


function App() {


  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + "/")
      .then((response) => response.json())
      .then((data) => {
        console.log("API Health Check:", data);
      })
      .catch((error) => {
        console.error("Error fetching API health:", error);
      });
  }, []);

  return (

    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<Home />} />
    </Routes>

    

  )
}

export default App
