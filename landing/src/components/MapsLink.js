const MapsLink = ({ href, label }) => {
  return (
    <span>
        📍 
        <a
            href={href}
            style={{color: "white", fontWeight: "bold" }}
            rel="noreferrer"
            target="_blank">
            {label}
        </a>
    </span>
  )
}

export default MapsLink;