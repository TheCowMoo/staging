CREATE TABLE IF NOT EXISTS \`user_invites\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`email\` varchar(320) NOT NULL,
  \`role\` enum('ultra_admin','super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user',
  \`token\` varchar(64) NOT NULL,
  \`invitedByUserId\` int NOT NULL,
  \`expiresAt\` timestamp NOT NULL,
  \`usedAt\` timestamp,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`user_invites_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`user_invites_token_unique\` UNIQUE(\`token\`)
);