# **App Name**: UniSport Central

## Core Features:

- User Authentication: Secure login and signup for students and administrators with role-based access control, utilizing Firebase Authentication. The secret key ensures authorized administrator access, changeable via admin settings after login.
- Event Management: Enable admins to create, edit, and manage sports events including details such as sport type, department, start date, duration, and settings. Supports redesigned add event flow including sport selection, team number input, sports plan editing and auto venue assignment.
- Venue Management: Allow admins to manage venues, including name, location, and capacity. Integrate venue booking functionality, preventing overlapping reservations. Provide a calendar view of reservations and modal display of event details.
- Team & Department Management: Manage teams participating in events, including team names, departments, and approval status. Enforce department logic for team participation and log department counts.
- Automatic Bracket Generation: Automatically generate and update tournament brackets, considering team approvals and department constraints, integrating sport-specific rules and schedule settings. Handle both round robin and knockout bracket formats.
- Conflict Detection: Implement real-time detection of venue booking conflicts. Detect and return structured conflict alerts for the admin when scheduling.
- AI-Powered Schedule Optimization Tool: Leverage AI to optimize event scheduling based on venue availability, team preferences, and time constraints. The LLM acts as a scheduling assistant tool that uses a knowledge of all event parameters, combined with logical reasoning, to make complex decisions and suggest efficient arrangements of matches.

## Style Guidelines:

- Primary color: Dark Blue (#3F51B5) to reflect a sense of authority and organization, and contrast against dark UI elements. The choice is in accordance to the requirements that the prompt made of a dark themed user interface.
- Background color: Dark Gray (#303030), nearly the same hue as the primary color, desaturated for subtlety, in order to support a dark scheme. Provides contrast while being easy on the eyes.
- Accent color: Deep Orange (#FF5722) – an analogous color to dark blue – provides vibrancy to CTAs, with the right balance of saturation and brightness so it won't become distracting when used for alerts and interactive components.
- Body and headline font: 'Inter', a grotesque-style sans-serif known for being readable and accessible. Note: currently only Google Fonts are supported.
- Code font: 'Source Code Pro' is suitable for computer code. Note: currently only Google Fonts are supported.
- Consistent use of flat, minimalist icons to represent sports and event categories.
- Grid-based layouts for event schedules and admin dashboards.
- Smooth transitions and subtle animations to enhance user interaction during event scheduling and data updates.