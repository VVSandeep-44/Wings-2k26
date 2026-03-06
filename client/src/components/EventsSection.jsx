import { useEffect, useRef, useState } from 'react';

const technicalEvents = [
    {
        title: 'Project Expo',
        description: 'Present innovative real-world projects, explain implementation, and demonstrate technical impact.',
        image: '/assets/ProjectExpo.jpeg',
    },
    {
        title: 'Circuitry',
        description: 'Design, analyze, and troubleshoot practical electronic circuits under timed challenge conditions.',
        image: '/assets/Circuitry.jpeg',
    },
    {
        title: 'Robotics',
        description: 'Build and control bots to solve task-based problem statements and arena rounds.',
        image: '/assets/Robotics.png',
    },
    {
        title: 'Web Planting with AI',
        description: 'Create modern web solutions by integrating AI-assisted workflows and deployment-ready architecture.',
        image: '/assets/WebPlanting.png',
    },
    {
        title: 'Techno Quiz',
        description: 'Compete in a fast-paced quiz covering emerging technologies, engineering trends, and innovation.',
        image: '/assets/TechnoQuiz.jpeg',
    },
    {
        title: 'Debugging Events',
        description: 'Identify and fix code-level issues efficiently with strong logic and precision under time constraints.',
        image: '/assets/DebuggingEvents.png',
    },
    {
        title: 'Startup Idea Pitching',
        description: 'Pitch scalable startup concepts, market fit, and execution plans to panel evaluators.',
        image: '/assets/StartupIdeaPitching.png',
    },
    {
        title: 'Paper Presentations (PPT)',
        description: 'Deliver clear, research-oriented technical presentations with structured problem-solution storytelling.',
        image: '/assets/PaperPresenation.png',
    },
];

export default function EventsSection() {
    const carouselRef = useRef(null);
    const isNormalizingRef = useRef(false);
    const [isAutoPaused, setIsAutoPaused] = useState(false);
    const loopSets = 3;
    const loopedEvents = Array.from({ length: loopSets }, () => technicalEvents).flat();

    const getStepSize = () => {
        const element = carouselRef.current;
        if (!element) return 0;
        const firstCard = element.querySelector('.event-card');
        if (!firstCard) return 0;
        const styles = window.getComputedStyle(element);
        const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
        return firstCard.getBoundingClientRect().width + gap;
    };

    const getSingleSetWidth = () => {
        const element = carouselRef.current;
        if (!element) return 0;

        const cards = element.querySelectorAll('.event-card');
        if (cards.length > technicalEvents.length) {
            const first = cards[0];
            const nextSetFirst = cards[technicalEvents.length];
            const measuredWidth = nextSetFirst.offsetLeft - first.offsetLeft;
            if (measuredWidth > 0) return measuredWidth;
        }

        return getStepSize() * technicalEvents.length;
    };

    const normalizeScrollPosition = () => {
        const element = carouselRef.current;
        if (!element || isNormalizingRef.current) return;

        const setWidth = getSingleSetWidth();
        if (setWidth <= 0) return;

        const middleStart = setWidth;
        const middleEnd = setWidth * 2;

        let targetLeft = null;
        if (element.scrollLeft < middleStart - 2) {
            targetLeft = element.scrollLeft + setWidth;
        } else if (element.scrollLeft > middleEnd + 2) {
            targetLeft = element.scrollLeft - setWidth;
        }

        if (targetLeft !== null) {
            isNormalizingRef.current = true;
            const previousBehavior = element.style.scrollBehavior;
            element.style.scrollBehavior = 'auto';
            element.scrollLeft = targetLeft;
            element.style.scrollBehavior = previousBehavior;
            window.requestAnimationFrame(() => {
                isNormalizingRef.current = false;
            });
        }
    };

    useEffect(() => {
        const element = carouselRef.current;
        if (!element) return undefined;

        const initializeLoopPosition = () => {
            const setWidth = getSingleSetWidth();
            if (setWidth > 0) {
                element.scrollLeft = setWidth;
            }
        };

        const onScroll = () => normalizeScrollPosition();

        const rafId = window.requestAnimationFrame(initializeLoopPosition);
        element.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', initializeLoopPosition);

        return () => {
            window.cancelAnimationFrame(rafId);
            element.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', initializeLoopPosition);
        };
    }, []);

    const handlePrev = () => {
        const element = carouselRef.current;
        if (!element) return;
        element.scrollBy({ left: -getStepSize(), behavior: 'smooth' });
    };

    const handleNext = () => {
        const element = carouselRef.current;
        if (!element) return;
        element.scrollBy({ left: getStepSize(), behavior: 'smooth' });
    };

    useEffect(() => {
        const element = carouselRef.current;
        if (!element) return undefined;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            if (isAutoPaused) return;

            const stepSize = getStepSize();
            if (stepSize <= 0) return;
            element.scrollBy({ left: stepSize, behavior: 'smooth' });
        }, 3000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isAutoPaused]);

    return (
        <section className="events-section" id="events">
            <h2 className="section-title">Technical Events</h2>

            <div
                className="events-carousel"
                aria-label="Technical events list and navigation"
                onMouseEnter={() => setIsAutoPaused(true)}
                onMouseLeave={() => setIsAutoPaused(false)}
                onFocusCapture={() => setIsAutoPaused(true)}
                onBlurCapture={() => setIsAutoPaused(false)}
            >
                <button
                    type="button"
                    className="events-side-btn"
                    onClick={handlePrev}
                    aria-label="Show previous technical events"
                >
                    ‹
                </button>

                <div className="events-grid" aria-label="Technical events list" ref={carouselRef}>
                    {loopedEvents.map((event, index) => (
                        <article
                            className="event-card"
                            key={`${event.title}-${index}`}
                        >
                            <div className="event-card-image-wrap">
                                <img src={event.image} alt={event.title} className="event-card-image" loading="lazy" />
                            </div>
                            <div className="event-card-body">
                                <h3>{event.title}</h3>
                                <p>{event.description}</p>
                            </div>
                        </article>
                    ))}
                </div>

                <button
                    type="button"
                    className="events-side-btn"
                    onClick={handleNext}
                    aria-label="Show next technical events"
                >
                    ›
                </button>
            </div>
        </section>
    );
}
