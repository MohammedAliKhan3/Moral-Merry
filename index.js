// This must be the very first line of your file to ensure environment variables are loaded before anything else tries to use them.
require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');
const axios = require('axios');

// Get the Groq API Key from environment variables.
// This is the ONLY place GROQ_API_KEY should be declared.
const GROQ_API_KEY = process.env.GROQ_API_KEY;

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
// Make sure to serve a 'downloads' or 'syllabus_pdfs' directory if your PDFs are there
// For example, if your PDFs are in 'public/downloads/syllabus':
app.use('/syllabus_pdfs', express.static(path.join(__dirname, 'public', 'downloads', 'syllabus')));


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
                description: "Students are trained in different sports"
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
        // Updated tuition array with detailed fee structure
        tuition: [
            { grade: "Nursery", amount: "₹8,400" },
            { grade: "LKG", amount: "₹9,000" },
            { grade: "UKG", amount: "₹9,600" },
            { grade: "Class I", amount: "₹10,800" },
            { grade: "Class II", amount: "₹11,400" },
            { grade: "Class III", amount: "₹12,000" },
            { grade: "Class IV", amount: "₹12,600" },
            { grade: "Class V", amount: "₹13,200" },
            { grade: "Class VI", amount: "₹13,800" },
            { grade: "Class VII", amount: "₹14,400" },
            { grade: "Class VIII", amount: "₹15,600" },
            { grade: "Class IX", amount: "₹16,800" },
            { grade: "Class X", amount: "₹20,400" }
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

// --- Server-side Student Database ---
const studentDatabase = [
    { class: "3A", rollNo: "14", name: "Asha Singh", guardianName: "Mr. Kumar Singh", dob: "2015-05-20", uniqueId: "3A-14", amountDue: "3000", feeStatus: "Pending" },
    { class: "3A", rollNo: "15", name: "Rohan Verma", guardianName: "Mrs. Anjali Verma", dob: "2015-04-12", uniqueId: "3A-15", amountDue: "3000", feeStatus: "Paid" },
    { class: "4B", rollNo: "10", name: "Priya Sharma", guardianName: "Mr. Raj Sharma", dob: "2014-09-01", uniqueId: "4B-10", amountDue: "3500", feeStatus: "Pending" }
];

// Fees Page
app.get('/fees', (req, res) => {
    res.render('fees', { page: 'fees' });
});

// AI Hub Page
app.get('/ai-hub', (req, res) => {
    res.render('ai-hub', { page: 'ai-hub' });
});

// Syllabus Page
app.get('/syllabus', (req, res) => {
    res.render('syllabus', {
        page: 'syllabus',
        syllabus: [
            {
                class: "Class 10",
                subjects: [
                    // Updated link for Class 10 Mathematics to the provided external URL
                    { name: "Mathematics", description: "Algebra, Geometry, Trigonometry, and Statistics.", link: "https://scert.telangana.gov.in/pdf/publication/ebooks2019/xth%20maths%20em.pdf" },
                    { name: "Physics", description: "Reflection and Refraction.", link: "https://scert.telangana.gov.in/pdf/publication/ebooks2019/x%20physics%20em.pdf" },
                    { name: "Biology", description: "Nutrition and Digestion.", link: "https://scert.telangana.gov.in/pdf/publication/ebooks2019/x%20biology%20em.pdf" },
                    { name: "English", description: "Grammar,Stories and Lessons", link: "https://scert.telangana.gov.in/pdf/publication/ebooks2019/10th%20class%20english%202020-21%2020.pdf" },
                    { name: "Social Studies", description: "Civics and History", link: "https://scert.telangana.gov.in/pdf/publication/ebooks2019/10th%20social%20em.pdf" },
                    { name: "Telugu", description: "State Language", link: "https://scert.telangana.gov.in/pdf/publication/ebooks2019/10th%20telugu%20fl%202020-21.pdf" },
                    { name: "Hindi", description: "National Language", link: "https://scert.telangana.gov.in/pdf/publication/ebooks2019/10th%20hindi%20sl%202020-21.pdf" }
                ]
            },
            {
                class: "Class 9",
                subjects: [
                    { name: "Mathematics", description: "Number Systems, Polynomials, and Geometry.", link: "https://scert.telangana.gov.in/pdf/publication/ebooks2019/ix%20maths%20em.pdf" },
                    { name: "Physics", description: "Matter, Cells, and Motion.", link: "https://scert.telangana.gov.in/pdf/publication/ebooks2019/ix%20physics%20em.pdf" },
                    { name: "Biology", description: "Nutrition and Digestion.", link: "https://scert.telangana.gov.in/pdf/publication/ebooks2019/9%20biosci%20em%202020-21.pdf" },
                    { name: "English", description: "Reading, Writing, and Grammar.", link: "https://scert.telangana.gov.in/pdf/publication/ebooks2019/9th%20eng.pdf" },
                    { name: "Social Studies", description: "India and the Contemporary World.", link: "https://scert.telangana.gov.in/pdf/publication/ebooks2019/9th%20social%20em.pdf" },
                    { name: "Telugu", description: "State Language", link: "https://scert.telangana.gov.in/PDF/publication/ebooks/9_TEL.pdf" },
                    { name: "Hindi", description: "National Language", link: "https://scert.telangana.gov.in/PDF/publication/ebooks/9_HIN(SL).pdf" }
                ]
            }
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

// API Endpoint for fetching fee details
app.post('/api/fees/details', (req, res) => {
    const { studentName, rollNumber, studentClass, guardianName, dob } = req.body;

    if (!studentName || !rollNumber || !studentClass) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Find student in the "database"
    const student = studentDatabase.find(s => {
        const isMatch = s.name.trim().toLowerCase() === studentName.trim().toLowerCase() &&
            s.rollNo.trim().toLowerCase() === rollNumber.trim().toLowerCase() === rollNumber.trim().toLowerCase() &&
            s.class.trim().toLowerCase() === studentClass.trim().toLowerCase();

        // Optional validation: if guardian name or DOB is provided, it must also match.
        if (isMatch) {
            const guardianMatch = !guardianName || s.guardianName.trim().toLowerCase() === guardianName.trim().toLowerCase();
            const dobMatch = !dob || s.dob === dob;
            return guardianMatch && dobMatch;
        }
        return false;
    });

    if (student) {
        // --- Dynamic UPI QR Code Generation ---
        const schoolUpiId = 'school@upi'; // Replace with your actual UPI ID
        const params = new URLSearchParams({
            pa: schoolUpiId,
            pn: "Moral Merry School", // Payee Name
            tr: `FEE-${student.uniqueId}-${Date.now()}`, // Transaction Reference ID
            am: student.amountDue,
            cu: 'INR',
            tn: `Fee for ${student.name}, Class ${student.class}` // Transaction Note
        });
        const upiLink = `upi://pay?${params.toString()}`;

        // Using a QR code generator API
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

        res.json({
            success: true,
            student: {
                ...student,
                qrCodeUrl, // Send the dynamically generated QR code URL
                date: new Date().toLocaleDateString()
            }
        });
    } else {
        res.status(404).json({ success: false, message: 'Student not found. Please check the details and try again.' });
    }
});

// POST: Chat endpoint
app.post('/chat', async (req, res) => {
    console.log('--- Incoming /chat request ---');
    console.log('Request Body:', JSON.stringify(req.body, null, 2)); // Log request body for debugging

    const { userMessage, conversation = [] } = req.body;

    if (!userMessage?.trim()) {
        console.error('Validation Error: userMessage is empty or null.');
        return res.status(400).json({ error: 'Message is required' });
    }

    // Ensure API Key is available. This check is crucial for local dev and deployment.
    if (!GROQ_API_KEY) {
        console.error('Server Error: GROQ_API_KEY is not set in environment variables. Check .env file and server restart.');
        return res.status(500).json({ success: false, error: 'Chat service not configured. API Key is missing.' });
    } else {
        console.log('GROQ_API_KEY is loaded.');
    }

    try {
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

                ***IMPORTANT GUIDELINES FOR YOUR RESPONSES:***
                1.  **Simplify, Simplify, Simplify:** Explain complex topics like Trigonometry or Science as if you're talking to a child who is just learning them. Use simple words and short sentences. Avoid jargon where possible.
                2.  **Use Analogies and Examples:** Always try to connect concepts to things kids already know or see in their daily lives. For example, for trigonometry, think about slopes of hills, building heights, or shadows.
                3.  **Relatable Real-World Applications:** When explaining "why" something is important (like trigonometry), give clear, fun examples of how it's used in the real world (e.g., how builders use it, or how game designers make characters move).
                4.  **Encouraging and Positive Tone:** Be very encouraging! Praise effort and curiosity. End your explanations by inviting more questions.
                5.  **Focus on Core Concepts:** Don't overload them with too much detail. Explain the main idea first.
                6.  **School Information:** For questions about the school (fees, timings, etc.), use the provided "School Overview" information. If asked about fees, always direct to the office.
                7.  **Stay within scope:** Do not generate information outside of what is provided about Moral Merry School or what is generally appropriate for a school AI assistant.
                8.  **Avoid complex formatting for explanations:** While lists and bolding are okay, avoid overly technical tables or mathematical notations unless specifically requested for a calculation. Focus on plain language explanations.
                `
            },
            // Filter and map conversation history to ensure valid structure and content
            ...conversation.filter(msg =>
                msg && typeof msg.role === 'string' && ['system', 'user', 'assistant'].includes(msg.role) &&
                typeof msg.content === 'string' && msg.content.trim()
            ).map(msg => ({ role: msg.role, content: msg.content.trim() })),
            { role: "user", content: userMessage.trim() }
        ];

        console.log('Sending messages to Groq API:', JSON.stringify(messages, null, 2));

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages,
            temperature: 0.7,
            max_tokens: 500,
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        const data = response.data;
        console.log('Groq API Raw Response Data:', JSON.stringify(data, null, 2));

        const reply = data.choices?.[0]?.message?.content?.trim();

        if (reply) {
            res.json({
                success: true,
                reply: reply,
                timestamp: new Date().toISOString()
            });
        } else {
            console.warn('Groq API response did not contain a valid reply. Full response:', JSON.stringify(data, null, 2));
            res.status(500).json({
                success: false,
                error: 'AI response was empty. Please try rephrasing.'
            });
        }


    } catch (error) {
        console.error('Error in /chat endpoint:', error.message);
        if (error.response) {
            console.error('Groq API Response Error Status:', error.response.status);
            console.error('Groq API Response Error Headers:', error.response.headers);
            console.error('Groq API Response Error Data:', JSON.stringify(error.response.data, null, 2)); // Log API error data
            // Attempt to send a more specific error if available from the API
            res.status(error.response.status || 500).json({
                success: false,
                error: `API Error: ${error.response.data?.error?.message || error.response.statusText || 'An error occurred with the AI service.'}`,
                debug: error.message
            });
        } else if (error.request) {
            // The request was made but no response was received (e.g., network error, timeout)
            console.error('Groq API Request Error: No response received.', error.request);
            res.status(504).json({
                success: false,
                error: 'AI service did not respond (timeout or network issue). Please try again.',
                debug: error.message
            });
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Local Request Setup Error:', error.message);
            res.status(500).json({
                success: false,
                error: 'A local error occurred while preparing the AI request.',
                debug: error.message
            });
        }
    }
});

// --- Server Start ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});