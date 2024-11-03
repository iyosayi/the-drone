# Drone Dispatch Controller

This project is a RESTful API service designed to manage a fleet of drones for delivering medications. The service enables clients to register drones, load them with medication, check loaded medications, verify available drones, and monitor drone battery levels. Additionally, it includes a Battery Monitor Service that runs every 30 minutes to track drone battery levels and store this information in MongoDB.

## Table of Contents
- [Project Description](#project-description)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Future Enhancements](#future-enhancements)

## Project Description
Drones have the potential to revolutionize transportation, especially for delivering urgent, small items to locations with challenging accessibility. This API acts as a **dispatch controller** for managing a fleet of 10 drones. Each drone can carry small loads (up to 500g) and can be assigned various statuses, from **IDLE** to **DELIVERING**.

## Technologies Used
- **NestJS**: A progressive Node.js framework for building efficient and scalable server-side applications.
- **MongoDB**: NoSQL database for flexible and scalable data storage.

## Features
- **Drone Registration**: Register a new drone with details such as serial number, model, weight limit, and battery capacity.
- **Medication Loading**: Load a drone with medication items, each with specific requirements (weight limit, code, and image).
- **Medication Inspection**: Check which medications are loaded on a given drone.
- **Drone Availability**: View available drones ready for loading.
- **Battery Monitoring**: Check the battery level of any drone.
- **Battery Monitor Service**: Automatically logs battery levels of all drones every 30 minutes to MongoDB.

## Getting Started

### Prerequisites
- Node.js (v20+)
- MongoDB

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/iyosayi/the-drone.git
   ```
2. Navigate to the project directory:
   ```bash
   cd the-drone
   ```
3. Install dependencies:
   ```bash
   yarn
   ```

### Running the Service
1. **Development**: Start the service in development mode.
   ```bash
   npm run dev
   ```
2. **Production**: Build the project.
   ```bash
   npm run build
   ```
3. **Seeding the Database**: The service includes a seeder that automatically populates the database with sample medications upon startup.

## Docker Compose

To easily set up the service with MongoDB, you can use Docker Compose. A `docker-compose.yml` file is provided to launch both the NestJS service and a MongoDB container.

### Steps
1. Ensure Docker is installed and running on your machine.
2. In the project root, run the following command to start the service and MongoDB:
   ```bash
   docker-compose up -d
   ```
   This will start both the **Drone Dispatch Controller** and **MongoDB** in the background.

3. Check the logs to confirm successful startup:
   ```bash
   docker-compose logs -f
   ```
4. To stop and remove the containers, use:
   ```bash
   docker-compose down
   ```

The Docker Compose setup will automatically apply the required environment variable `MONGO_DB_URL` for MongoDB connectivity.

## API Endpoints
Here is a summary of the core endpoints. For full details, refer to the [API documentation](https://documenter.getpostman.com/view/8430059/2sAY4xBhLe).

### Drones
- **Register Drone**: `POST /drones`
- **Check Drone Battery**: `GET /drones/battery-health/:droneId`
- **Load Drone**: `GET /drones/:droneId/load`
- **List Available Drones**: `GET /drones/available`
- **Get Drone With Orders**: `GET /drones/details/:droneId`

### Medications
- **Get All Medications**: `GET /medications`
- **Get Medication By Id**: `GET /medications/:id`


## Environment Variables
The following environment variable is required to configure the database connection:

| Variable       | Description                   |
|----------------|-------------------------------|
| `MONGO_DB_URL` | URL to connect to MongoDB     |

Create a `.env` file in the root directory and add the above variables with appropriate values.

## Testing
This project includes test cases to ensure functionality and reliability. Run tests with the following command:

```bash
npm test
```