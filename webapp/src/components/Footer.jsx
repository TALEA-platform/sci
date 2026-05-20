export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner">
        <img src="./talea-logo.png" alt="Talea" className="footer-logo" />
        <a
          href="https://talea.comune.bologna.it"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
          talea.comune.bologna.it
        </a>
      </div>
    </footer>
  );
}
