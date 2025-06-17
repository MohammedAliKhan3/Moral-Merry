// This must be the very first line of your file to ensure environment variables are loaded before anything else tries to use them.
require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');
const axios = require('axios');

// Get the DeepSeek API Key from environment variables.
// This is the ONLY place DEEPSEEK_API_KEY should be declared.
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// --- Middleware Setup ---

// Configure CORS for production and local development.
// For production, set CORS_ORIGIN on your hosting platform (e.g., Render)
// to your domain(s) like "https://moralmerry.in,https://www.moralmerry.in,https://moral-merry.onrender.com"
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
        console.log('Incoming CORS origin:', origin); // <-- IMPORTANT DEBUG LOG
        console.log('Allowed origins (from ENV):', allowedOrigins); // <-- IMPORTANT DEBUG LOG

        // Check if the incoming origin is in our allowed list, or if it's a null origin (e.g., for direct file access, same-origin calls, or some non-browser requests)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error('CORS Error: Origin NOT allowed by your configuration:', origin); // <-- IMPORTANT DEBUG LOG
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware (only once, before any routes that need it)
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies


// --- View Engine Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Static Files Serving ---
// Serve static files (CSS, JS, images) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// --- Routes ---

// Home Page
app.get('/', (req, res) => {
    res.render('home', {
        page: 'home',
        heroTitle: "Moral Merry School",
        heroSubtitle: " LIGHTED TO LIGHTEN ",
        features: [
            {
                title: "Academic Excellence",
                icon: "📚",
                description: "Top-ranked curriculum with 98% college acceptance rate"
            },
            {
                title: "Sports Programs",
                icon: "⚽",
                description: "State championship teams in 8 different sports"
            },
            {
                title: "Arts Education",
                icon: "🎨",
                description: "Award-winning visual and performing arts programs"
            },
            {
                title: "Yoga",
                icon: "🎨",
                description: "Kids are taught Yoga to be stress free."
            }
        ],
        news: [
            {
                title: "Science Fair Winners",
                date: "May 15, 2023",
                excerpt: "Our students won 3 gold medals at the state science fair"
            },
            {
                title: "New Campus Expansion",
                date: "April 28, 2023",
                excerpt: "Construction begins on our new STEM innovation center"
            }
        ],
        stats: [
            { value: "98%", label: "College Acceptance" },
            { value: "25", label: "AP Courses" },
            { value: "1:10", label: "Teacher Ratio" },
            { value: "50+", label: "Clubs & Activities" }
        ],
        campusImages: [
            {
                src: "/images/SirSpeech.jpg",
                alt: "Main academic building",
                caption: "Our state-of-the-art academic center"
            },
            {
                src: "/images/yoga.jpg",
                alt: "Sports facilities",
                caption: "Olympic-sized swimming pool and track"
            },
            {
                src: "/images/treeDress.jpg",
                alt: "Library",
                caption: "Award-winning library with 50,000 volumes"
            },
            {
                src: "/images/StudentMarch.jpg",
                alt: "Library",
                caption: "Award-winning library with 50,000 volumes"
            }
        ]
    });
});

// About Page
app.get('/about', (req, res) => {
    res.render('about', {
        page: 'about',
        mission: "To empower students through innovative learning experiences that foster intellectual curiosity, creativity, and character development.",
        stats: [
            { value: "98%", label: "Graduation Rate" },
            { value: "25+", label: "AP Courses" },
            { value: "1:12", label: "Teacher Ratio" },
            { value: "50+", label: "Clubs & Activities" }
        ],
        faculty: [
            {
                name: "Sir Abdul Akbar Khan",
                position: "Principal",
                bio: "20+ years in educational leadership with a PhD in Curriculum Development",
                image: "principal.jpg"
            },
            {
                name: "Michael Chen",
                position: "Dean of Academics",
                bio: "Specialist in STEM education and former NASA educator",
                image: "dean.jpg"
            }
        ]
    });
});

// Admissions Page
app.get('/admissions', (req, res) => {
    res.render('admissions', {
        page: 'admissions',
        steps: [
            { number: "01", title: "Application", description: "Submit online application form" },
            { number: "02", title: "Assessment", description: "Complete academic evaluation" },
            { number: "03", title: "Interview", description: "Family interview with admissions team" },
            { number: "04", title: "Decision", description: "Receive admission decision" }
        ],
        deadlines: [
            { term: "Fall 2025", date: "January 15, 2025", status: "Open" },
            { term: "Spring 2025", date: "October 1, 2025", status: "Open" }
        ],
        tuition: [
            { grade: "K-5", amount: "₹10K" },
            { grade: "6-8", amount: "₹11K" },
            { grade: "9-12", amount: "₹12K" }
        ]
    });
});

// Programs Page
app.get('/programs', (req, res) => {
    res.render('programs', {
        page: 'programs',
        programs: [
            {
                name: "STEM Academy",
                description: "Advanced science, technology, engineering and math program",
                image: "stem.jpg",
                grades: "6-12"
            },
            {
                name: "International Baccalaureate",
                description: "World-renowned IB diploma program",
                image: "ib.jpg",
                grades: "11-12"
            },
            {
                name: "Arts Conservatory",
                description: "Pre-professional arts training",
                image: "arts.jpg",
                grades: "9-12"
            }
        ]
    });
});

// News Page
app.get('/news', (req, res) => {
    res.render('news', {
        page: 'news',
        articles: [
            {
                title: "Planting Trees Drive",
                date: "May, 2025",
                image: "plantingTrees.png",
                excerpt: "Our team and students are dedicated to plant 100 trees!",
                category: "Achievements"
            },
            {
                title: "New Environmental Program",
                date: "May 22, 2023",
                image: "newsPaper.png",
                excerpt: "Partnership with the Nature Conservancy",
                category: "Academics"
            }
        ]
    });
});

// Contact Page
app.get('/contact', (req, res) => {
    res.render('contact', {
        page: 'contact',
        departments: [
            { name: "Admissions", email: "admissions@greenwood.edu", phone: "(555) 123-4567" },
            { name: "Academic Office", email: "academics@greenwood.edu", phone: "(555) 123-4568" }
        ],
        hours: [
            { day: "Monday-Friday", time: "8:00 AM - 5:00 PM" },
            { day: "Saturday", time: "9:00 AM - 12:00 PM" }
        ]
    });
});

// Gallery Page
app.get('/gallery', (req, res) => {
    res.render('gallery', {
        page: 'gallery',
        galleryTitle: "Campus Life & Events",
        images: [
            { src: "/images/collab3.jpg", alt: "collab 3" },
            { src: "/images/collab2.jpg", alt: "Collab 1" },
            { src: "/images/collab1.jpg", alt: "Collab 2" },
            { src: "/images/assembly.jpg", alt: "Assembly" },
            { src: "/images/scienceDay.jpg", alt: "Science Exhibition" },
            { src: "/images/sports.jpg", alt: "Sports Meet" },
            { src: "/images/fancyDress.jpg", alt: "Fancy Dress" },
            { src: "/images/yoga.jpg", alt: "Yoga" },
            { src: "/images/studentSong.jpg", alt: "Students Singing" },
            { src: "/images/prize3.jpg", alt: "Prize" },
            { src: "/images/class2.jpg", alt: "Classroom 1" },
            { src: "/images/class3.jpg", alt: "Classroom 2" },
            { src: "/images/dress1.jpg", alt: "fancy dress 1" },
            { src: "/images/dress2.jpg", alt: "fancy dress 2" },
            { src: "/images/dress3.jpg", alt: "fancy dress 3" },
            { src: "/images/yoga2.jpg", alt: "Yoga 2" },
            { src: "/images/boysPose.jpg", alt: "Boys Pose" },
            { src: "/images/girlsPose.jpg", alt: "Girls Pose" },
            { src: "/images/kidsPlaying1.jpg", alt: "Kids Playing 1" },
            { src: "/images/kidsPlaying2.jpg", alt: "Kids Playing 2" },
            { src: "/images/kidsPlaying3.jpg", alt: "Kids Playing 3" },
            { src: "/images/scienceExhibition1.jpg", alt: "Science Exhibition 1" },
            { src: "/images/scienceExhibition2.jpg", alt: "Science Exhibition 2" },
            { src: "/images/scienceExhibition3.jpg", alt: "Science Exhibition 3" }
        ]
    });
});

// --- API Endpoints ---

// POST: Contact Form Submission
app.post('/api/contact', (req, res) => {
    const { name, email, subject, message, _honeypot } = req.body;

    // Basic honeypot spam check
    if (_honeypot) {
        return res.status(400).json({ error: 'Spam detected' });
    }

    // Validate required fields (simple check)
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'Please fill all required fields' });
    }

    console.log('Contact Form Submission:');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Subject:', subject);
    console.log('Message:', message);

    return res.status(200).json({ message: 'Thank you for contacting us! We will get back to you soon.' });
});

// POST: Chat endpoint
app.post('/chat', async (req, res) => {
    try {
        console.log('Received POST request to /chat');
        const { userMessage, conversation = [] } = req.body;

        if (!userMessage?.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Ensure API Key is available. This check is crucial for local dev and deployment.
        if (!DEEPSEEK_API_KEY) {
            console.error('DEEPSEEK_API_KEY is not set in environment variables.');
            return res.status(500).json({ success: false, error: 'Chat service not configured. API Key is missing.' });
        }

        const messages = [
            {
                role: "system",
                content: `You are an AI assistant for Moral Merry School, your name is MMS Champ. The school focuses on moral values and coextensive learning, promoting unity in diversity.

                🏫 School Overview:
                Name: Moral Merry High School
                Principal: Mr. Abdul Akbar Khan
                Location: 10-4-13/11/A/5/1, MG Nagar, Owaisi Pura, Masab Tank, Hyderabad, Telangana 500028

                🕗 Timings:
                School Hours: 8:00 AM to 3:00 PM (Monday to Saturday)

                💰 Fees:
                Minimal and Affordable: Designed to make quality education accessible to all families. Always direct users to contact the office for current fee structures. Do not quote exact amounts.

                🎓 Academics & Recognition:
                Strong Academic Curriculum
                Awards for English-Speaking Students
                Annual Science Fair and Competitions

                🧘 Extracurricular Activities:
                Yoga and Meditation Sessions
                Sports Programs
                Creative and Engaging Club Activities

                👩‍🏫 Faculty:
                Experienced and Caring Teachers
                Supportive Learning Environment

                📅 Special Initiatives:
                Parent Connect Days – Monthly interaction between teachers and parents
                Language & Leadership Workshops

                Guideline: Always maintain a professional, helpful, and school-appropriate tone. If asked about fees, always direct to the office. Do not generate information outside of what is provided about Moral Merry School.`
            },
            ...conversation.filter(msg =>
                msg?.role && ['system', 'user', 'assistant'].includes(msg.role) &&
                typeof msg.content === 'string' && msg.content.trim()
            ).map(msg => ({ role: msg.role, content: msg.content.trim() })),
            { role: "user", content: userMessage.trim() }
        ];

        const response = await axios.post('https://api.together.xyz/v1/chat/completions', {
            // Confirmed: Using your preferred model
            model: "meta-llama/Llama-Vision-Free",
            messages,
            temperature: 0.7,
            max_tokens: 150, // Confirmed: Using your preferred max_tokens
        }, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 8000 // Confirmed: Using your preferred timeout
        });

        const data = response.data;
        const reply = data.choices?.[0]?.message?.content?.trim();

        res.json({
            success: true,
            reply: reply || "I didn't get a response. Please try again.",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in /chat endpoint:', error.message);
        if (error.response) {
            console.error('API Response Error Data:', error.response.data);
        }
        res.status(500).json({
            success: false,
            error: 'Chat service unavailable',
            debug: error.message // Keep this for debugging during development, consider removing in production for security
        });
    }
});

// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});