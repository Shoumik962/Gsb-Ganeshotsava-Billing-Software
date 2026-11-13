/** Self-contained local-radius plot. It is NOT a road/street map: route links use Google Maps. */
interface HomePin { family_id: string; family_name: string; latitude: number; longitude: number; distance_km: number; }
export default function NearbyMap({gps,homes,radiusKm=3}:{gps:{lat:number;lon:number};homes:HomePin[];radiusKm?:number}) {
  const radians=gps.lat*Math.PI/180;
  const x=(lon:number)=>300+((lon-gps.lon)*111.2*Math.cos(radians)/radiusKm)*150;
  const y=(lat:number)=>180-((lat-gps.lat)*111.2/radiusKm)*150;
  return <figure className="card overflow-hidden p-4">
    <figcaption className="mb-2 font-display text-xl font-bold">Nearby households • GPS radius plot</figcaption>
    <p className="mb-3 text-xs text-maroon-800/75">Approximate positions within {radiusKm} km. This is not a street map; use “Navigate to home” below for road directions.</p>
    <svg viewBox="0 0 600 360" role="img" aria-label="Map plot showing sevadar at center and nearby family households" className="w-full rounded-xl bg-cream-100">
      <g stroke="#dbc9b6" strokeWidth="1" fill="none">
        <circle cx="300" cy="180" r="150"/><circle cx="300" cy="180" r="100"/><circle cx="300" cy="180" r="50"/>
        <line x1="30" x2="570" y1="180" y2="180"/><line x1="300" x2="300" y1="20" y2="340"/>
      </g>
      <text x="300" y="18" textAnchor="middle" fill="#825d4c" fontSize="12">N</text>
      <text x="450" y="175" fill="#825d4c" fontSize="11">{radiusKm} km</text>
      {homes.map((h,i)=> <g key={h.family_id}>
        <circle cx={x(h.longitude)} cy={y(h.latitude)} r="8" fill="#1d6658" stroke="white" strokeWidth="2"/>
        <text x={x(h.longitude)+11} y={y(h.latitude)-8} fontSize="11" fill="#1b3d37">{i+1}. {h.family_name.slice(0,16)}</text>
        <title>{h.family_name} • {h.distance_km} km</title>
      </g>)}
      <circle cx="300" cy="180" r="9" fill="#9a2331" stroke="white" strokeWidth="3"/>
      <text x="311" y="201" fill="#761c2b" fontWeight="bold" fontSize="12">You</text>
    </svg>
  </figure>;
}
