CREATE TABLE `listPlaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listId` int NOT NULL,
	`placeId` int NOT NULL,
	`note` text,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `listPlaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(20),
	`icon` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `places` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`googlePlaceId` varchar(255),
	`name` varchar(255) NOT NULL,
	`address` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`genre` varchar(100),
	`features` json,
	`summary` text,
	`source` varchar(50),
	`googleMapsUrl` text,
	`phoneNumber` varchar(50),
	`rating` decimal(2,1),
	`priceLevel` int,
	`photoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `places_id` PRIMARY KEY(`id`)
);
