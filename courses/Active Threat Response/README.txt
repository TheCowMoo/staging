HOW TO UPLOAD TO S3
====================
1. Upload this folder (or its contents) to your S3 bucket under:
   s3://your-bucket-name/courses/Active Threat Response/

2. The course will auto-discover when you visit the Training Modules page.

FILE STRUCTURE
==============
courses/Active Threat Response/
├── course_link.txt        ← Maps to external URL & display name
├── course.webp            ← (optional) 400x300px thumbnail image
└── README.txt             ← This file

TROUBLESHOOTING
===============
- If courses don't appear, go to the Migrations page and run pending migrations
  (this adds the 'external_link' playerType and thumbnailUrl column to the DB).
- course.webp is optional — recommended size 400x300px.