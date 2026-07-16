import { Routes, Route } from "react-router-dom";
import Health from "./pages/Health";
import Home from "./pages/Home";

function App() {

  return (

    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/health" element={<Health />} />
    </Routes>

  )
}

export default App
