import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Health from "./pages/Health";

function App() {

  return (

    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/health" element={<Health />} />
    </Routes>

  )
}

export default App
