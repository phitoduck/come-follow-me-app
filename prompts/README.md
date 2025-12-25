## Groups

1. Elders Quorum
2. Relief Society
3. Young Men
4. Young Women

## Questions

1. Have you completed your ministering this week?
2. Have you checked in on your neighbors?
3. Do you like this survey?

## Backend

The backend should be a 

1. FastAPI app
  1. endpoints
    1. [ ] endpoint to submit the survey
    2. [ ] endpoint to get the reports
    3. [ ] endpoint to post a story (all anonymous)
    4. [ ] endpoint to get the stories
  2. settings: pydantic-settings.BaseSettings
  3. use Pydantic models for all endpoints
  4. use a class called `SheetsService` to handle read/write operations to the google sheet
  5. use a class called `CSVService` which implements the same methods as `SheetsService` but using a local CSV file, for local development
2. a google sheet
  1. [ ] one worksheet for the questions
    1. Columns
      - `datetime_submitted` of the form `YYYY-MM-DD HH:MM:SS` UTC
      - `q1` one of `yes` or `no`
      - `q2` one of `yes` or `no`
      - `q3` one of `yes` or `no`
      - `organization` one of `relief society` or `elders quorum` or `young mens` or `young womens`
  2. [ ] one worksheet for the posts
    1. Columns
      - `datetime_submitted` of the form `YYYY-MM-DD HH:MM:SS` UTC
      - `content`
3. use uv with `uv init --lib --python 3.11`