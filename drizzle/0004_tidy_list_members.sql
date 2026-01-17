CREATE TABLE `listMembers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `listId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
  `invitedBy` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `listMembers_listId_userId` (`listId`, `userId`)
);
