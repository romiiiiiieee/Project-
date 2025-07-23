// js/my_classes.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    where, // Make sure 'where' is imported
    getDocs,
    doc,
    getDoc // Keep getDoc for fetching user profile if needed for other things, but not for joinedClasses here
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase configuration (copied from your dashboard.js)
const firebaseConfig = {
    apiKey: "AIzaSyCWp4G154pzyxTvM6jKJ9Ckxuvf8_h82mM",
    authDomain: "ecclasswebsitefinal.firebaseapp.com",
    projectId: "ecclasswebsitefinal",
    storageBucket: "ecclasswebsitefinal.firebasestorage.app",
    messagingSenderId: "1001100262118",
    appId: "1:1001100262118:web:78321a67ca5fc7654e1927",
    measurementId: "G-1FSR9EDHHN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const logoutLink = document.getElementById('logoutLink');
const createdClassesContainer = document.getElementById('createdClassesContainer');
const joinedClassesContainer = document.getElementById('joinedClassesContainer');
const noCreatedClassesMessage = document.getElementById('noCreatedClassesMessage');
const noJoinedClassesMessage = document.getElementById('noJoinedClassesMessage');

let currentUserId = null;

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Auth state listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("User logged in:", user.uid);
            await fetchAndRenderClasses(currentUserId);
        } else {
            currentUserId = null;
            console.log("User not authenticated. Displaying empty lists or messages.");
            // Do NOT redirect to login.html here
            // Instead, clear the containers and show the "No classes" messages.
            createdClassesContainer.innerHTML = '';
            joinedClassesContainer.innerHTML = '';
            noCreatedClassesMessage.style.display = 'block';
            noJoinedClassesMessage.style.display = 'block';
        }
    });

    // Logout functionality
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                localStorage.removeItem('loggedInUser'); // Consistent with dashboard.js
                console.log("User signed out.");
                window.location.href = 'login.html'; // Still redirect to login AFTER successful logout
            } catch (error) {
                console.error("Error signing out:", error);
                alert("Error signing out: " + error.message);
            }
        });
    }

    // Highlight active nav link (adapted from your dashboard.js)
    const navLinks = document.querySelectorAll('.nav-links a');
    const currentPath = window.location.pathname; // Gets path like '/my_classes.html'

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href'); // Gets href like 'my_classes.html'

        // Check if the current path includes the link's href (for sub-paths, etc.)
        // Ensure exact match for dashboard/index
        if (currentPath.includes(linkPath) && linkPath !== '#') {
            link.classList.add('active');
        } else if (linkPath === 'dashboard.html' && (currentPath === '/' || currentPath.endsWith('/index.html') || currentPath === '')) {
            // Special handling for dashboard/index being the default homepage
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});

// --- Class Fetching and Rendering ---

async function fetchAndRenderClasses(userId) {
    // If user is not logged in (userId is null), explicitly display no classes.
    if (!userId) {
        console.log("No user authenticated. Displaying no classes.");
        createdClassesContainer.innerHTML = '';
        joinedClassesContainer.innerHTML = '';
        noCreatedClassesMessage.style.display = 'block';
        noJoinedClassesMessage.style.display = 'block';
        return; // Exit the function as there's no user data to fetch
    }

    // 1. Fetch Classes Created by the User
    try {
        // Assuming 'ownerId' is used in the class document, consistent with your rules
        const createdClassesQuery = query(collection(db, 'classes'), where('ownerId', '==', userId));
        const createdClassesSnapshot = await getDocs(createdClassesQuery);
        const createdClasses = createdClassesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderClasses(createdClasses, createdClassesContainer, noCreatedClassesMessage, true); // true indicates created classes
    } catch (error) {
        console.error("Error fetching created classes:", error);
        createdClassesContainer.innerHTML = '<p class="empty-message error-message" style="color: red;">Failed to load your created classes.</p>';
        noCreatedClassesMessage.style.display = 'none'; // Hide default message if error message is shown
    }

    // 2. Fetch Classes Joined by the User
    // THIS SECTION IS CHANGED TO USE 'students' array in class document
    try {
        // Query classes where the 'students' array contains the current user's ID
        const joinedClassesQuery = query(collection(db, 'classes'), where('students', 'array-contains', userId));
        const joinedClassesSnapshot = await getDocs(joinedClassesQuery);
        const joinedClasses = joinedClassesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderClasses(joinedClasses, joinedClassesContainer, noJoinedClassesMessage, false); // false indicates joined classes
    } catch (error) {
        console.error("Error fetching joined classes:", error);
        joinedClassesContainer.innerHTML = '<p class="empty-message error-message" style="color: red;">Failed to load your joined classes.</p>';
        noJoinedClassesMessage.style.display = 'none'; // Hide default message if error message is shown
    }
}

function renderClasses(classList, containerElement, emptyMessageElement, isCreatedList) {
    containerElement.innerHTML = ''; // Clear previous content
    if (classList.length === 0) {
        emptyMessageElement.style.display = 'block';
    } else {
        emptyMessageElement.style.display = 'none';
        classList.forEach(classData => {
            const classCard = document.createElement('div');
            classCard.classList.add('class-card', 'clickable'); // Add 'clickable' class for styling
            classCard.setAttribute('data-class-id', classData.id);

            // Use 'image' property from classData if it exists, otherwise use placeholder
            const classImage = classData.image || 'https://via.placeholder.com/200x120?text=Class+Image'; // Consistent with dashboard.js

            // Display "Code" only if it exists in classData (primarily for created classes)
            let codeDisplay = '';
            if (classData.code) {
                codeDisplay = `<p>Code: ${classData.code}</p>`;
            }

            // Display "Creator" for joined classes (if 'creatorName' or 'ownerName' exists)
            // Or if it's a created class, you might still want to show "Creator: You"
            let creatorDisplay = '';
            if (classData.ownerName) { // Assuming 'ownerName' might be stored, or you can derive it
                creatorDisplay = `<p>Creator: ${classData.ownerName}</p>`;
            } else if (isCreatedList) {
                // For created classes, we know the current user is the creator
                creatorDisplay = `<p>Creator: You</p>`;
            }


            classCard.innerHTML = `
                <h3>${classData.name || 'Untitled Class'}</h3>
                <img src="${classImage}" alt="${classData.name || 'Class Image'}">
                ${codeDisplay}
                ${creatorDisplay}
                `;
            classCard.addEventListener('click', () => {
                window.location.href = `class_conversation.html?classId=${classData.id}`;
            });
            containerElement.appendChild(classCard);
        });
    }
}
