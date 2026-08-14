export const swaggerDocument = {
  "openapi": "3.0.0",
  "info": {
    "title": "BookNGo API Documentation",
    "version": "1.0.0",
    "description": "Comprehensive RESTful API documentation for BookNGo Bus Transportation System.",
    "contact": {
      "name": "Mukarram",
      "email": "admin@bookngo.com"
    }
  },
  "servers": [
    {
      "url": "http://localhost:5000/api/v1",
      "description": "Local Development Server"
    },
    {
      "url": "https://backend-fyp-kappa.vercel.app/api/v1",
      "description": "Production Vercel Server"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Enter your Bearer JWT token in the format: Bearer <token>"
      }
    },
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "email": { "type": "string" },
          "phoneNumber": { "type": "string" },
          "role": { "type": "string", "enum": ["user", "operator", "companyadmin", "superadmin"] },
          "status": { "type": "string", "enum": ["pending", "approved", "rejected"] },
          "company": { "type": "string" }
        }
      },
      "Company": {
        "type": "object",
        "properties": {
          "_id": { "type": "string" },
          "name": { "type": "string" },
          "email": { "type": "string" },
          "phone": { "type": "string" },
          "address": { "type": "string" },
          "status": { "type": "string", "enum": ["pending", "approved", "rejected"] }
        }
      },
      "Bus": {
        "type": "object",
        "properties": {
          "_id": { "type": "string" },
          "busNumber": { "type": "string" },
          "registrationNumber": { "type": "string" },
          "type": { "type": "string", "enum": ["AC", "Non-AC", "Sleeper", "Luxury"] },
          "totalSeats": { "type": "integer" },
          "amenities": { "type": "array", "items": { "type": "string" } },
          "status": { "type": "string", "enum": ["active", "inactive"] }
        }
      },
      "Route": {
        "type": "object",
        "properties": {
          "_id": { "type": "string" },
          "from": { "type": "string" },
          "to": { "type": "string" },
          "fromCity": { "type": "string" },
          "toCity": { "type": "string" },
          "distance": { "type": "number" },
          "duration": { "type": "string" }
        }
      },
      "Schedule": {
        "type": "object",
        "properties": {
          "_id": { "type": "string" },
          "route": { "type": "string" },
          "bus": { "type": "string" },
          "operator": { "type": "string" },
          "departureDate": { "type": "string", "format": "date" },
          "departureTime": { "type": "string" },
          "arrivalTime": { "type": "string" },
          "fare": { "type": "number" },
          "availableSeats": { "type": "integer" },
          "status": { "type": "string", "enum": ["active", "in-progress", "completed", "cancelled"] }
        }
      },
      "Booking": {
        "type": "object",
        "properties": {
          "_id": { "type": "string" },
          "pnr": { "type": "string" },
          "schedule": { "type": "string" },
          "passenger": { "type": "string" },
          "totalAmount": { "type": "number" },
          "paymentStatus": { "type": "string", "enum": ["pending", "paid", "refunded"] },
          "bookingStatus": { "type": "string", "enum": ["confirmed", "cancelled"] }
        }
      }
    }
  },
  "tags": [
    { "name": "Authentication", "description": "User registration, login, token refresh and session endpoints" },
    { "name": "Company Management", "description": "Transport company registration and admin controls" },
    { "name": "Operator Operations", "description": "Operator dispatch, trip status, manifest & scope management" },
    { "name": "Fleet (Buses)", "description": "Bus inventory and specifications management" },
    { "name": "Routes", "description": "Intercity bus routes and terminal specifications" },
    { "name": "Schedules", "description": "Trip dispatching, departure timetables, and search" },
    { "name": "Bookings", "description": "Seat reservation, passenger ticketing, and cancellation" },
    { "name": "Payments", "description": "Stripe payment intents and webhook handling" },
    { "name": "Payouts", "description": "Automated and manual payout engine triggers" },
    { "name": "User Profile", "description": "User profile management and security settings" }
  ],
  "paths": {
    "/register": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Register a new user or operator",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name", "email", "password", "phoneNumber"],
                "properties": {
                  "name": { "type": "string", "example": "John Doe" },
                  "email": { "type": "string", "example": "john@example.com" },
                  "password": { "type": "string", "example": "password123" },
                  "phoneNumber": { "type": "string", "example": "03001234567" },
                  "role": { "type": "string", "enum": ["user", "operator"], "example": "user" },
                  "company": { "type": "string", "example": "60d0fe4f5311236168a109ca" },
                  "operatorType": { "type": "string", "example": "trip_operator" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Account created successfully" },
          "400": { "description": "Validation error" },
          "409": { "description": "Email already registered" }
        }
      }
    },
    "/login": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Authenticate user & obtain JWT tokens",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["email", "password"],
                "properties": {
                  "email": { "type": "string", "example": "admin@bookngo.com" },
                  "password": { "type": "string", "example": "admin123" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Login successful with tokens and user details" },
          "401": { "description": "Invalid credentials" },
          "403": { "description": "Account not approved" }
        }
      }
    },
    "/refresh-token": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Refresh access token using refresh token",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["refreshToken"],
                "properties": {
                  "refreshToken": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "New access and refresh tokens returned" },
          "403": { "description": "Invalid or expired refresh token" }
        }
      }
    },
    "/logout": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Logout user and invalidate refresh token",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Logged out successfully" }
        }
      }
    },
    "/update/{id}": {
      "put": {
        "tags": ["Authentication"],
        "summary": "Update user account information",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "email": { "type": "string" },
                  "phoneNumber": { "type": "string" },
                  "password": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "User updated successfully" }
        }
      }
    },
    "/approve/{id}": {
      "put": {
        "tags": ["Authentication"],
        "summary": "Approve user account (Superadmin / CompanyAdmin)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "User approved successfully" }
        }
      }
    },
    "/companies/company-requests": {
      "post": {
        "tags": ["Company Management"],
        "summary": "Submit a new transport company registration request (Requires logged-in user or userId)",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name", "email", "address"],
                "properties": {
                  "name": { "type": "string", "example": "Faisal Movers" },
                  "email": { "type": "string", "example": "info@faisalmovers.com" },
                  "address": { "type": "string", "example": "Lahore, Pakistan" },
                  "phone": { "type": "string", "example": "042-111-222-333" },
                  "userId": { "type": "string", "example": "67a123456789abcdef012345" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Company request created successfully. Waiting for Super Admin approval." },
          "400": { "description": "Missing required fields or user account reference" }
        }
      }
    },
    "/companies/list": {
      "get": {
        "tags": ["Company Management"],
        "summary": "Get list of registered companies",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Array of companies returned" }
        }
      }
    },
    "/companies/one/{id}": {
      "get": {
        "tags": ["Company Management"],
        "summary": "Get details of a specific company",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Company object returned" }
        }
      }
    },
    "/companies/approve/{id}": {
      "put": {
        "tags": ["Company Management"],
        "summary": "Approve or reject company registration (Promotes creator to Company Admin upon approval)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["action"],
                "properties": {
                  "action": { "type": "string", "enum": ["approve", "reject"] }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Company status updated and creator promoted to companyadmin if approved" }
        }
      }
    },
    "/companies/delete/{id}": {
      "delete": {
        "tags": ["Company Management"],
        "summary": "Delete company (Superadmin only)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Company deleted" }
        }
      }
    },
    "/operator/company": {
      "get": {
        "tags": ["Operator Operations"],
        "summary": "Get list of company operators",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Array of operators returned" }
        }
      }
    },
    "/operator/approve/{id}": {
      "put": {
        "tags": ["Operator Operations"],
        "summary": "Approve or reject operator status",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["action"],
                "properties": {
                  "action": { "type": "string", "enum": ["approve", "reject"] }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Operator status updated" }
        }
      }
    },
    "/operator/scope/{id}": {
      "put": {
        "tags": ["Operator Operations"],
        "summary": "Update operator type and scope assignment",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "operatorType": { "type": "string", "enum": ["trip_operator", "city_manager", "company_manager"] },
                  "operatorScope": {
                    "type": "object",
                    "properties": {
                      "cities": { "type": "array", "items": { "type": "string" } },
                      "buses": { "type": "array", "items": { "type": "string" } },
                      "schedules": { "type": "array", "items": { "type": "string" } }
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Operator scope updated" }
        }
      }
    },
    "/operator/my-trips": {
      "get": {
        "tags": ["Operator Operations"],
        "summary": "Get operator's assigned trips",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Assigned trips array" }
        }
      }
    },
    "/operator/trips/{id}/passengers": {
      "get": {
        "tags": ["Operator Operations"],
        "summary": "Get trip passenger manifest",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Passenger manifest list" }
        }
      }
    },
    "/operator/trips/{id}/start": {
      "patch": {
        "tags": ["Operator Operations"],
        "summary": "Mark trip as in-progress (Start trip)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Trip started" }
        }
      }
    },
    "/operator/trips/{id}/complete": {
      "patch": {
        "tags": ["Operator Operations"],
        "summary": "Mark trip as completed",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Trip completed" }
        }
      }
    },
    "/buses/all": {
      "get": {
        "tags": ["Fleet (Buses)"],
        "summary": "Get all active buses (Public endpoint for passengers)",
        "responses": {
          "200": { "description": "List of active buses" }
        }
      }
    },
    "/buses/company": {
      "get": {
        "tags": ["Fleet (Buses)"],
        "summary": "Get company buses",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "List of company buses" }
        }
      }
    },
    "/buses/add": {
      "post": {
        "tags": ["Fleet (Buses)"],
        "summary": "Add a new bus to fleet",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["busNumber", "registrationNumber", "type", "totalSeats"],
                "properties": {
                  "busNumber": { "type": "string", "example": "B-101" },
                  "registrationNumber": { "type": "string", "example": "LEA-2025" },
                  "type": { "type": "string", "enum": ["AC", "Non-AC", "Sleeper", "Luxury"], "example": "AC" },
                  "totalSeats": { "type": "integer", "example": 40 },
                  "seatLayout": { "type": "string", "example": "2x2" },
                  "amenities": { "type": "array", "items": { "type": "string" }, "example": ["WiFi", "AC", "Charging Port"] }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Bus added successfully" }
        }
      }
    },
    "/buses/{id}": {
      "get": {
        "tags": ["Fleet (Buses)"],
        "summary": "Get bus details by ID",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Bus details object" }
        }
      },
      "put": {
        "tags": ["Fleet (Buses)"],
        "summary": "Update bus details",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/Bus" }
            }
          }
        },
        "responses": {
          "200": { "description": "Bus updated successfully" }
        }
      },
      "delete": {
        "tags": ["Fleet (Buses)"],
        "summary": "Deactivate bus",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Bus deactivated successfully" }
        }
      }
    },
    "/routes/allRoutes": {
      "get": {
        "tags": ["Routes"],
        "summary": "Get all routes for company",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "List of routes" }
        }
      }
    },
    "/routes/createRoute": {
      "post": {
        "tags": ["Routes"],
        "summary": "Create a new route",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["from", "to", "fromCity", "toCity"],
                "properties": {
                  "from": { "type": "string", "example": "Kalma Chowk Terminal" },
                  "to": { "type": "string", "example": "Faizabad Terminal" },
                  "fromCity": { "type": "string", "example": "Lahore" },
                  "toCity": { "type": "string", "example": "Islamabad" },
                  "distance": { "type": "number", "example": 380 },
                  "duration": { "type": "string", "example": "4h 30m" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Route created successfully" }
        }
      }
    },
    "/routes/updateRoute/{id}": {
      "patch": {
        "tags": ["Routes"],
        "summary": "Update route details",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Route updated successfully" }
        }
      }
    },
    "/routes/deleteRoute/{id}": {
      "delete": {
        "tags": ["Routes"],
        "summary": "Deactivate route",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Route deactivated successfully" }
        }
      }
    },
    "/schedules/search": {
      "get": {
        "tags": ["Schedules"],
        "summary": "Search available schedules (Public endpoint)",
        "parameters": [
          { "name": "fromCity", "in": "query", "required": true, "schema": { "type": "string" }, "example": "Lahore" },
          { "name": "toCity", "in": "query", "required": true, "schema": { "type": "string" }, "example": "Islamabad" },
          { "name": "date", "in": "query", "schema": { "type": "string" }, "example": "2025-05-20" }
        ],
        "responses": {
          "200": { "description": "Search results array" }
        }
      }
    },
    "/schedules/company": {
      "get": {
        "tags": ["Schedules"],
        "summary": "Get company schedule listings",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "List of company schedules" }
        }
      }
    },
    "/schedules/create": {
      "post": {
        "tags": ["Schedules"],
        "summary": "Dispatch a new schedule",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["routeId", "busId", "operatorId", "departureDate", "departureTime", "arrivalTime", "fare"],
                "properties": {
                  "routeId": { "type": "string" },
                  "busId": { "type": "string" },
                  "operatorId": { "type": "string" },
                  "departureDate": { "type": "string", "example": "2025-05-20" },
                  "departureTime": { "type": "string", "example": "08:00" },
                  "arrivalTime": { "type": "string", "example": "12:30" },
                  "fare": { "type": "number", "example": 1500 }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Schedule dispatched successfully" }
        }
      }
    },
    "/bookings/book": {
      "post": {
        "tags": ["Bookings"],
        "summary": "Book seats on a trip",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["scheduleId", "seats"],
                "properties": {
                  "scheduleId": { "type": "string" },
                  "seats": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "required": ["seatNumber", "passengerName", "passengerCNIC", "passengerPhone", "gender"],
                      "properties": {
                        "seatNumber": { "type": "integer", "example": 5 },
                        "passengerName": { "type": "string", "example": "Ali Khan" },
                        "passengerCNIC": { "type": "string", "example": "35202-1234567-1" },
                        "passengerPhone": { "type": "string", "example": "03001234567" },
                        "gender": { "type": "string", "enum": ["Male", "Female"], "example": "Male" }
                      }
                    }
                  },
                  "paymentIntentId": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Booking created and ticket generated" }
        }
      }
    },
    "/bookings/my": {
      "get": {
        "tags": ["Bookings"],
        "summary": "Get logged-in user's booking history",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "List of user bookings" }
        }
      }
    },
    "/bookings/schedule/{scheduleId}": {
      "get": {
        "tags": ["Bookings"],
        "summary": "Get all bookings for a specific schedule",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "scheduleId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Bookings list for schedule" }
        }
      }
    },
    "/bookings/company/all": {
      "get": {
        "tags": ["Bookings"],
        "summary": "Get all company bookings & financial totals",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Company bookings list" }
        }
      }
    },
    "/bookings/cancel/{bookingId}": {
      "delete": {
        "tags": ["Bookings"],
        "summary": "Cancel booking and issue refund",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "bookingId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Booking cancelled and seats released" }
        }
      }
    },
    "/payment/create-intent": {
      "post": {
        "tags": ["Payments"],
        "summary": "Create Stripe PaymentIntent",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Client secret returned" }
        }
      }
    },
    "/payout/trigger": {
      "post": {
        "tags": ["Payouts"],
        "summary": "Trigger automated payout calculation check (Superadmin only)",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Payout engine triggered" }
        }
      }
    },
    "/profile/getUser/{id}": {
      "get": {
        "tags": ["User Profile"],
        "summary": "Get user profile details",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "User profile data" }
        }
      }
    },
    "/profile/updateUser/{id}": {
      "patch": {
        "tags": ["User Profile"],
        "summary": "Update user profile details",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Profile updated" }
        }
      }
    },
    "/profile/changePassword/{id}": {
      "patch": {
        "tags": ["User Profile"],
        "summary": "Change user password",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Password updated" }
        }
      }
    }
  }
};
