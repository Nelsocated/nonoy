-- CreateTable
CREATE TABLE "login_attempts" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("key","window_start")
);
