import { Link } from 'react-router-dom';

const FEATURES = [
  { title: 'Visual builder', desc: 'Drag, connect, and configure nodes on a canvas built for real automation pipelines.' },
  { title: 'Durable by design', desc: 'Every completed step is logged as an immutable event — nothing repeats after a crash.' },
  { title: 'Replay on demand', desc: 'Re-run a single stage without losing the history that came before it.' },
];

export default function Landing() {
  return (
    <div>
      <div
        className="text-center px-6 pt-24 pb-28 text-white"
        style={{ background: 'radial-gradient(120% 140% at 15% 0%, #F05D58 0%, #DB5550 62%, #b8332f 100%)' }}
      >
        <div className="inline-flex items-center gap-2 font-mono text-[11.5px] tracking-wide uppercase bg-white/[0.14] border border-white/20 px-3.5 py-1.5 rounded-full mb-7">
          AI Automation Engine · Durable by Design
        </div>
        <h1 className="font-display font-extrabold tracking-tight text-[clamp(40px,7vw,78px)] leading-[1.03] mb-5">
          Build. Execute.
          <br />
          <span className="text-[#FFE8CF]">Recover.</span>
        </h1>
        <p className="max-w-[580px] mx-auto text-[17px] leading-relaxed text-white/90 mb-9">
          FlowEngine is an automation engine for AI workflows — connect nodes, run them reliably, and if the server crashes
          mid-run, it resumes exactly where it left off. No repeated work, no lost output.
        </p>
        <div className="flex gap-3.5 justify-center flex-wrap">
          <Link to="/login" className="px-5.5 py-3 rounded-full font-semibold bg-white/[0.12] border-[1.5px] border-white/40 hover:bg-white/20 transition-colors">
            Start building
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 max-w-[1000px] mx-auto px-6 -mt-11 relative z-10">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-white rounded-[18px] p-6 shadow-[0_8px_16px_-6px_rgba(57,57,55,0.18),0_24px_48px_-20px_rgba(57,57,55,0.28)] border border-ink/[0.08]">
            <h3 className="font-display text-[17px] mb-2">{f.title}</h3>
            <p className="text-[14px] text-ink/70 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="h-20" />
    </div>
  );
}
