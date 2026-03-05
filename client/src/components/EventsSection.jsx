import { useMemo, useState } from 'react';

const technicalEvents = [
    {
        title: 'Project Expo',
        description: 'Present innovative real-world projects, explain implementation, and demonstrate technical impact.',
        image: '/assets/pydah-college.jpeg',
    },
    {
        title: 'Circuitry',
        description: 'Design, analyze, and troubleshoot practical electronic circuits under timed challenge conditions.',
        image: '/assets/logopng.png',
    },
    {
        title: 'Robotics',
        description: 'Build and control bots to solve task-based problem statements and arena rounds.',
        image: '/assets/logopng1.png',
    },
    {
        title: 'Web Planting with AI',
        description: 'Create modern web solutions by integrating AI-assisted workflows and deployment-ready architecture.',
        image: '/assets/logopng2.png',
    },
    {
        title: 'Techno Quiz',
        description: 'Compete in a fast-paced quiz covering emerging technologies, engineering trends, and innovation.',
        image: '/assets/jpg wings.jpeg',
    },
    {
        title: 'Debugging Events',
        description: 'Identify and fix code-level issues efficiently with strong logic and precision under time constraints.',
        image: '/assets/Wingslogo.png',
    },
    {
        title: 'Startup Idea Pitching',
        description: 'Pitch scalable startup concepts, market fit, and execution plans to panel evaluators.',
        image: '/assets/Wingsmobile.jpeg',
    },
    {
        title: 'Paper Presentations (PPT)',
        description: 'Deliver clear, research-oriented technical presentations with structured problem-solution storytelling.',
        image: '/assets/pydah-logo.jpeg',
    },
];

export default function EventsSection() {
    const [startIndex, setStartIndex] = useState(0);
    const visibleCount = 3;
    const maxStartIndex = Math.max(technicalEvents.length - visibleCount, 0);

    const visibleEvents = useMemo(
        () => technicalEvents.slice(startIndex, startIndex + visibleCount),
        [startIndex]
    );

    const handlePrev = () => {
        setStartIndex((prev) => Math.max(prev - 1, 0));
    };

    const handleNext = () => {
        setStartIndex((prev) => Math.min(prev + 1, maxStartIndex));
    };

    return (
        <section className="events-section" id="events">
            <h2 className="section-title">Technical Events</h2>

            <div className="events-carousel" aria-label="Technical events list and navigation">
                <button
                    type="button"
                    className="events-side-btn"
                    onClick={handlePrev}
                    disabled={startIndex === 0}
                    aria-label="Show previous technical events"
                >
                    ‹
                </button>

                <div className="events-grid" aria-label="Technical events list">
                    {visibleEvents.map((event) => (
                        <article className="event-card" key={event.title}>
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
                    disabled={startIndex >= maxStartIndex}
                    aria-label="Show next technical events"
                >
                    ›
                </button>
            </div>
        </section>
    );
}
