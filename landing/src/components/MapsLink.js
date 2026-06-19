const MapsLink = ({ href, label }) => {
  return (
    <a
      href={href}
      style={{color: "white", fontWeight: "bold" }}
      rel="noreferrer"
      target="_blank">
      📍 {label}
    </a>
  )
}

export default MapsLink;