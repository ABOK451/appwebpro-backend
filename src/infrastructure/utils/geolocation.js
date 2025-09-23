const fetch = require('node-fetch');

async function obtenerUbicacionGoogle() {
  try {
    const res = await fetch(
      `https://www.googleapis.com/geolocation/v1/geolocate?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ considerIp: true }) 
      }
    );

    const data = await res.json();

    return {
      lat: data.location?.lat || null,
      lng: data.location?.lng || null,
      accuracy: data.accuracy || null
    };
  } catch (error) {
    console.error("Error al obtener geolocalización:", error);
    return { lat: null, lng: null };
  }
}

module.exports = { obtenerUbicacionGoogle };
