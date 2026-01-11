ALTER TABLE `places` ADD `genreParent` varchar(50);--> statement-breakpoint
ALTER TABLE `places` ADD `genreChild` varchar(50);--> statement-breakpoint
ALTER TABLE `places` ADD `budgetLunch` varchar(20);--> statement-breakpoint
ALTER TABLE `places` ADD `budgetDinner` varchar(20);--> statement-breakpoint
ALTER TABLE `places` ADD `reviewCount` int DEFAULT 0;