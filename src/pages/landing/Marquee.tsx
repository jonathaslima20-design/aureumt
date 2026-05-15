const items = ['Google Gemini', 'WhatsApp API', 'Neural Processing', 'High Fidelity', '24/7 Autonomy'];

export function Marquee() {
  const repeated = [...items, ...items, ...items];

  return (
    <section className="border-y border-white/5 bg-[#080808] py-10 overflow-hidden marquee-mask">
      <div className="animate-marquee w-[300%] flex items-center gap-24">
        {repeated.map((item, i) => (
          <span
            key={i}
            className="text-white/20 font-display font-bold text-2xl tracking-widest uppercase whitespace-nowrap"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
