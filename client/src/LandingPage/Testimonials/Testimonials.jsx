import React, { useEffect, useState } from 'react';
import './Testimonials.css';
// import user_1 from '../../assets/shiv.jpg';
// import user_2 from '../../assets/aadi.jpg';
// import user_3 from '../../assets/satya.jpg';
// import user_4 from '../../assets/shubham.jpg';
import user_5 from '../../assets/aashu.jpg';

const testimonials = [
    // {
    //     img: user_1,
    //     name: "Shivraj Darekar",
    //     role: "Software Developer",
    //     text: "Working on this Financial Advisor platform has been an incredible experience. Crafting secure, scalable software to help users manage their finances smarter is deeply rewarding."
    // },
    // {
    //     img: user_2,
    //     name: "Aditya Deshmukh",
    //     role: "ML Engineer",
    //     text: "We're using machine learning to offer personalized financial insights. It's amazing to see data-driven strategies genuinely help users plan their futures."
    // },
    // {
    //     img: user_3,
    //     name: "Satya Prakash",
    //     role: "Full Stack Developer",
    //     text: "Building this comprehensive financial platform has taught me so much about user experience and financial technology. The impact we're making is truly meaningful."
    // },
    // {
    //     img: user_4,
    //     name: "Shubham Kumar",
    //     role: "UI/UX Designer",
    //     text: "Designing intuitive interfaces for financial management has been challenging yet rewarding. Every detail matters when helping users make better financial decisions."
    // },
    {
        img: user_5,
        name: "Mitesh Chaudhari",
        role: "Full Stack Developer",
        text: "I am a motivated and versatile individual, always eager to take on new challenges. With a passion for learning I am dedicated to delivering high-quality results. I am ready to make a meaningful contribution and achieve great things."
    }
];

const Testimonials = () => {
    const [activeIndex, setActiveIndex] = useState(1);
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Auto-scroll effect with circular loop
    useEffect(() => {
        if (isMobile) return; // Don't auto-scroll on mobile
        
        const interval = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % testimonials.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [isMobile, testimonials.length]);

    const handleCardClick = (index) => {
        if (!isMobile) {
            setActiveIndex(index);
        }
    };

    const getCardStyle = (index) => {
        if (isMobile) {
            return {
                transform: 'none',
                opacity: 1,
                zIndex: 1,
                filter: 'none'
            };
        }

        // Calculate the relative position considering circular loop
        let relativeIndex = index - activeIndex;
        
        // Handle circular wrapping
        if (relativeIndex > 1) {
            relativeIndex -= testimonials.length;
        } else if (relativeIndex < -1) {
            relativeIndex += testimonials.length;
        }

        const distance = Math.abs(relativeIndex);
        
        if (distance === 0) {
            // Center card (active) - positioned higher
            return {
                transform: 'scale(1.1) translateY(-20px)',
                opacity: 1,
                zIndex: 10,
                filter: 'none'
            };
        } else if (distance === 1) {
            // Adjacent cards - positioned to left/right but lower with increased gap
            const isLeft = relativeIndex < 0;
            return {
                transform: `scale(0.85) translateX(${isLeft ? '-180px' : '180px'}) translateY(40px) rotateY(${isLeft ? '15deg' : '-15deg'})`,
                opacity: 0.7,
                zIndex: 5,
                filter: 'blur(1px)'
            };
        } else {
            // Far cards - positioned further left/right and lower with increased gap
            const isLeft = relativeIndex < 0;
            return {
                transform: `scale(0.7) translateX(${isLeft ? '-300px' : '300px'}) translateY(80px) rotateY(${isLeft ? '25deg' : '-25deg'})`,
                opacity: 0.3,
                zIndex: 1,
                filter: 'blur(2px)'
            };
        }
    };

    return (
        <div className="testimonials-carousel">
            <div className="carousel-container">
                {testimonials.map((testimonial, index) => (
                    <div
                        key={index}
                        className={`carousel-card ${index === activeIndex ? 'active' : ''} ${isMobile ? 'mobile-card' : ''}`}
                        style={getCardStyle(index)}
                        onClick={() => handleCardClick(index)}
                    >
                        <div className="card-content">
                            <div className="user-info">
                                <div className="avatar-container">
                                    <img src={testimonial.img} alt={testimonial.name} />
                                    <div className="avatar-glow"></div>
                                </div>
                                <div className="user-details">
                                    <h3>{testimonial.name}</h3>
                                    <span>{testimonial.role}</span>
                                </div>
                            </div>
                            <div className="testimonial-text">
                                <p>{testimonial.text}</p>
                            </div>
                            <div className="card-decoration">
                                <div className="decoration-line"></div>
                                <div className="decoration-dot"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Navigation dots for mobile */}
            {isMobile && (
                <div className="mobile-dots">
                    {testimonials.map((_, index) => (
                        <button
                            key={index}
                            className={`dot ${index === activeIndex ? 'active' : ''}`}
                            onClick={() => setActiveIndex(index)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Testimonials;