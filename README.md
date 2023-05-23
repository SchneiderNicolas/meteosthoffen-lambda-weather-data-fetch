# Weather Data Fetcher

This repository contains an AWS Lambda function designed to fetch current weather data from a personal WeatherLink station. In the event that the weather station is not operational, it will fallback on data from the Open-Meteo forecast API. It will also send an alert to a specified Discord channel when it detects that the WeatherLink station is down.

## Setup and Configuration

- `API_KEY` and `API_SECRET`: WeatherLink API credentials.
- `STATION_ID`: ID of the WeatherLink station.
- `DISCORD_WEBHOOK_URL`: URL of the Discord webhook that will be used for sending alerts.
- `DISCORD_NOTIFICATION_LAMBDA`: Name of the AWS Lambda function responsible for sending notifications to Discord.
