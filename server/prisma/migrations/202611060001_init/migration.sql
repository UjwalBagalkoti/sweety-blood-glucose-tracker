CREATE TYPE "TimeSlot" AS ENUM ('MORNING', 'AFTER_BREAKFAST', 'AFTER_LUNCH', 'AFTER_DINNER');

CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "readings" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "reading_date" DATE NOT NULL,
  "time_slot" "TimeSlot" NOT NULL,
  "glucose_value" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "readings_user_id_reading_date_time_slot_key"
  ON "readings"("user_id", "reading_date", "time_slot");
CREATE INDEX "readings_user_id_reading_date_idx" ON "readings"("user_id", "reading_date");

ALTER TABLE "readings" ADD CONSTRAINT "readings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
