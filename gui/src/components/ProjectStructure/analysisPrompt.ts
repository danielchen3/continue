// AI Full-stack Project Analysis Prompt
export const FULL_STACK_ANALYSIS_PROMPT = `You are a full-stack project analysis expert familiar with frontend/backend development architecture and visualization design.

I will attach a complete project folder to you. Please analyze and return the following structured content in JSON format, followed by a plain text project description for visualization:

{
  "project_name": "",                     // Project name (from package.json or other config)
  "description": "",                      // Project description (summarized from README.md or comments)
  "tech_stack": {
    "frontend": [],                       // Main frontend frameworks/libraries (React, Vite, Tailwind)
    "backend": [],                        // Backend frameworks/languages/databases (Flask, Express, SQLite)
    "other": []                           // Others like Docker, Redis, CI/CD tools
  },
  "structure": {
    "frontend": [                         // Main frontend modules or pages (App.tsx, Home.tsx)
      {
        "file": "",                       // File name or component path
        "description": "",               // Component purpose / page function
        "dependencies": [],               // Referenced components or libraries
        "methods": [                      // Key methods/functions in this file
          {
            "name": "",                   // Method name
            "line": 0,                    // Line number (if detectable)
            "description": ""             // Method description
          }
        ],
        "connects_to": []                 // Which other components this connects to (by file name)
      }
    ],
    "backend": [                          // Main backend modules (API routes, database models)
      {
        "file": "",                       
        "description": "",
        "routes": [                       // If API routes, list paths
          {
            "method": "",                // GET, POST etc
            "path": "",                  
            "description": "",           // Route function description
            "line": 0                    // Line number in file
          }
        ],
        "methods": [                      // Key methods/functions
          {
            "name": "",
            "line": 0,
            "description": ""
          }
        ],
        "connects_to": [],                // Which frontend components call this
        "database_models": []             // Which database models this uses
      }
    ],
    "database": [                         // Database models (if any)
      {
        "model": "",                     
        "fields": [],                    
        "description": "",
        "file": "",                       // Model definition file
        "used_by": []                     // Which backend modules use this model
      }
    ]
  },
  "connections": [                        // Explicit component relationships for visualization
    {
      "from": "",                         // Source component file name
      "to": "",                           // Target component file name  
      "type": "",                         // "api_call", "import", "data_flow", "route"
      "description": "",                  // Description of the connection
      "method": ""                        // Specific method/route if applicable
    }
  ],
  "recommendations": [                    // Auto-generated visualization suggestions
    "Suggest which modules can be drawn as flowcharts/component diagrams",
    "Which parts have complex code logic worth highlighting"
  ]
}

---

PLAIN TEXT PROJECT DESCRIPTION (for visualization):

项目: [Project Name]

技术栈: [List main technologies separated by commas]

前端:
- [Component.tsx]: [Description]
  - [method1()]: [Method description]
  - [method2()]: [Method description]
- [Another.tsx]: [Description]

后端:
- [api/routes.py]: [Description]
  - GET /api/users: [Route description]
  - POST /api/login: [Route description]
- [models.py]: [Description]

数据库:
- User: [Model description]
- Product: [Model description]

Requirements:
- Output both JSON and plain text sections
- Plain text should follow the exact format shown above for proper parsing
- Focus on providing clear architectural insights for full-stack development understanding
- **IMPORTANT**: Analyze import statements, API calls, and data flow to populate "connects_to" and "connections" arrays
- Try to identify line numbers for methods and routes by analyzing the code structure
- Include specific connection types like API calls between frontend and backend, database queries, etc.`;
