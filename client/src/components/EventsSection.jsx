import { useEffect, useRef, useState } from 'react';

const technicalEvents = [
    {
        title: 'Project Expo',
        description: 'Present innovative real-world projects, explain implementation, and demonstrate technical impact.',
        image: '/assets/pydah-college.jpeg',
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
        image: '/assets/Webplanting.png',
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
        image: '/assets/StartupIdeaPitching.jpeg',
    },
    {
        title: 'Paper Presentations (PPT)',
        description: 'Deliver clear, research-oriented technical presentations with structured problem-solution storytelling.',
        image: '/assets/PaperPresentation.png',
    },
];

export default function EventsSection() {
    const carouselRef = useRef(null);
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(true);

    useEffect(() => {
        const element = carouselRef.current;
        if (!element) return undefined;

        const updateScrollButtons = () => {
            const maxScrollLeft = element.scrollWidth - element.clientWidth;
            setCanScrollPrev(element.scrollLeft > 2);
            setCanScrollNext(element.scrollLeft < maxScrollLeft - 2);
        };

        updateScrollButtons();
        element.addEventListener('scroll', updateScrollButtons, { passive: true });
        window.addEventListener('resize', updateScrollButtons);

        return () => {
            element.removeEventListener('scroll', updateScrollButtons);
            window.removeEventListener('resize', updateScrollButtons);
        };
    }, []);

    const getStepSize = () => {
        const element = carouselRef.current;
        if (!element) return 0;
        const firstCard = element.querySelector('.event-card');
        if (!firstCard) return 0;
        const styles = window.getComputedStyle(element);
        const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
        return firstCard.getBoundingClientRect().width + gap;
    };

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

    return (
        <section className="events-section" id="events">
            <h2 className="section-title">Technical Events</h2>

            <div className="events-carousel" aria-label="Technical events list and navigation">
                <button
                    type="button"
                    className="events-side-btn"
                    onClick={handlePrev}
                    disabled={!canScrollPrev}
                    aria-label="Show previous technical events"
                >
                    ‹
                </button>

                <div className="events-grid" aria-label="Technical events list" ref={carouselRef}>
                    {technicalEvents.map((event) => (
                        <article
                            className="event-card"
                            key={event.title}
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
                    disabled={!canScrollNext}
                    aria-label="Show next technical events"
                >
                    ›
                </button>
            </div>
        </section>
    );
}
