export default function PageLoader({ fadingOut }) {
    return (
        <div className={`page-loader${fadingOut ? ' fade-out' : ''}`} role="status" aria-live="polite" aria-label="Loading page">
            <div className="page-loader-inner">
                <div className="page-loader-flag-wrap" aria-hidden="true">
                    <span className="page-loader-ring"></span>
                    <span className="page-loader-orbit"></span>
                    <span className="page-loader-spark"></span>
                    <img
                        src="/assets/PydahFlag.png"
                        alt=""
                        className="page-loader-flag"
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                        width="560"
                        height="560"
                    />
                </div>
                <h2>PYDAH WINGS 2K26</h2>
                <p>Preparing your experience...</p>
            </div>
        </div>
    );
}
