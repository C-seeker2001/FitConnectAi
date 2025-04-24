-- Insert test users
INSERT INTO users (username, password, email, avatar, bio, weekly_goal, use_metric)
VALUES 
  ('JohnFitness', 'password123', 'john@example.com', 'https://i.pravatar.cc/150?u=john', 'Fitness enthusiast focused on strength training. Personal trainer with 5 years of experience.', 5, true),
  ('SarahRunner', 'password123', 'sarah@example.com', 'https://i.pravatar.cc/150?u=sarah', 'Marathon runner and yoga instructor. Love sharing my journey and helping others achieve their goals.', 6, false),
  ('MikeLift', 'password123', 'mike@example.com', 'https://i.pravatar.cc/150?u=mike', 'Powerlifter and nutrition specialist. Working on my first competition this year.', 4, true)
ON CONFLICT (username) DO NOTHING;

-- Sample workout data
INSERT INTO workouts (user_id, name, start_time, end_time, notes, use_metric)
VALUES 
  -- John's workouts
  ((SELECT id FROM users WHERE username = 'JohnFitness'), 'Upper Body Day', NOW() - INTERVAL '2 day', NOW() - INTERVAL '2 day' + INTERVAL '1 hour', 'Great pump today, chest is feeling stronger.', true),
  ((SELECT id FROM users WHERE username = 'JohnFitness'), 'Leg Day', NOW() - INTERVAL '4 day', NOW() - INTERVAL '4 day' + INTERVAL '1 hour 30 minutes', 'Pushed hard on squats, new PR!', true),
  
  -- Sarah's workouts
  ((SELECT id FROM users WHERE username = 'SarahRunner'), '5K Training Run', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', 'Maintained a good pace throughout.', false),
  ((SELECT id FROM users WHERE username = 'SarahRunner'), 'Yoga and Stretching', NOW() - INTERVAL '3 day', NOW() - INTERVAL '3 day' + INTERVAL '45 minutes', 'Much needed recovery session.', false),
  
  -- Mike's workouts
  ((SELECT id FROM users WHERE username = 'MikeLift'), 'Deadlift Session', NOW() - INTERVAL '2 day', NOW() - INTERVAL '2 day' + INTERVAL '1 hour 15 minutes', 'New personal best: 405 lbs for 3 reps!', true),
  ((SELECT id FROM users WHERE username = 'MikeLift'), 'Bench Press Day', NOW() - INTERVAL '5 day', NOW() - INTERVAL '5 day' + INTERVAL '1 hour', 'Working on technique, focusing on form.', true);

-- Add exercises to workouts
INSERT INTO exercises (workout_id, name)
VALUES
  -- John's upper body exercises
  ((SELECT id FROM workouts WHERE name = 'Upper Body Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness')), 'Bench Press'),
  ((SELECT id FROM workouts WHERE name = 'Upper Body Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness')), 'Overhead Press'),
  ((SELECT id FROM workouts WHERE name = 'Upper Body Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness')), 'Barbell Rows'),
  
  -- John's leg day exercises
  ((SELECT id FROM workouts WHERE name = 'Leg Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness')), 'Squats'),
  ((SELECT id FROM workouts WHERE name = 'Leg Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness')), 'Leg Press'),
  ((SELECT id FROM workouts WHERE name = 'Leg Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness')), 'Calf Raises'),
  
  -- Sarah's exercises
  ((SELECT id FROM workouts WHERE name = '5K Training Run' AND user_id = (SELECT id FROM users WHERE username = 'SarahRunner')), 'Treadmill Run'),
  ((SELECT id FROM workouts WHERE name = 'Yoga and Stretching' AND user_id = (SELECT id FROM users WHERE username = 'SarahRunner')), 'Downward Dog'),
  ((SELECT id FROM workouts WHERE name = 'Yoga and Stretching' AND user_id = (SELECT id FROM users WHERE username = 'SarahRunner')), 'Warrior Pose'),
  
  -- Mike's exercises
  ((SELECT id FROM workouts WHERE name = 'Deadlift Session' AND user_id = (SELECT id FROM users WHERE username = 'MikeLift')), 'Deadlift'),
  ((SELECT id FROM workouts WHERE name = 'Deadlift Session' AND user_id = (SELECT id FROM users WHERE username = 'MikeLift')), 'Pull-ups'),
  ((SELECT id FROM workouts WHERE name = 'Bench Press Day' AND user_id = (SELECT id FROM users WHERE username = 'MikeLift')), 'Bench Press'),
  ((SELECT id FROM workouts WHERE name = 'Bench Press Day' AND user_id = (SELECT id FROM users WHERE username = 'MikeLift')), 'Tricep Extensions');

-- Add sets to exercises
INSERT INTO sets (exercise_id, weight, reps, rpe)
VALUES
  -- John's bench press sets
  ((SELECT id FROM exercises WHERE name = 'Bench Press' AND workout_id = (SELECT id FROM workouts WHERE name = 'Upper Body Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness'))), 80, 10, 7),
  ((SELECT id FROM exercises WHERE name = 'Bench Press' AND workout_id = (SELECT id FROM workouts WHERE name = 'Upper Body Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness'))), 90, 8, 8),
  ((SELECT id FROM exercises WHERE name = 'Bench Press' AND workout_id = (SELECT id FROM workouts WHERE name = 'Upper Body Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness'))), 100, 6, 9),
  
  -- John's squat sets
  ((SELECT id FROM exercises WHERE name = 'Squats' AND workout_id = (SELECT id FROM workouts WHERE name = 'Leg Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness'))), 120, 8, 8),
  ((SELECT id FROM exercises WHERE name = 'Squats' AND workout_id = (SELECT id FROM workouts WHERE name = 'Leg Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness'))), 130, 6, 9),
  
  -- Sarah's treadmill run
  ((SELECT id FROM exercises WHERE name = 'Treadmill Run' AND workout_id = (SELECT id FROM workouts WHERE name = '5K Training Run' AND user_id = (SELECT id FROM users WHERE username = 'SarahRunner'))), NULL, NULL, 7),
  
  -- Mike's deadlift sets
  ((SELECT id FROM exercises WHERE name = 'Deadlift' AND workout_id = (SELECT id FROM workouts WHERE name = 'Deadlift Session' AND user_id = (SELECT id FROM users WHERE username = 'MikeLift'))), 150, 8, 7),
  ((SELECT id FROM exercises WHERE name = 'Deadlift' AND workout_id = (SELECT id FROM workouts WHERE name = 'Deadlift Session' AND user_id = (SELECT id FROM users WHERE username = 'MikeLift'))), 170, 5, 8),
  ((SELECT id FROM exercises WHERE name = 'Deadlift' AND workout_id = (SELECT id FROM workouts WHERE name = 'Deadlift Session' AND user_id = (SELECT id FROM users WHERE username = 'MikeLift'))), 180, 3, 9);

-- Create posts related to workouts
INSERT INTO posts (user_id, workout_id, content)
VALUES
  -- John's posts
  ((SELECT id FROM users WHERE username = 'JohnFitness'), 
   (SELECT id FROM workouts WHERE name = 'Upper Body Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness')),
   'Hit a new bench press PR today! 💪 Feeling stronger every week. Consistency is key!'),
  
  ((SELECT id FROM users WHERE username = 'JohnFitness'), 
   (SELECT id FROM workouts WHERE name = 'Leg Day' AND user_id = (SELECT id FROM users WHERE username = 'JohnFitness')),
   'Never skip leg day! Pushed through a tough workout but feeling accomplished. My quads are going to be sore tomorrow! 🏋️‍♂️'),
  
  -- Sarah's posts
  ((SELECT id FROM users WHERE username = 'SarahRunner'), 
   (SELECT id FROM workouts WHERE name = '5K Training Run' AND user_id = (SELECT id FROM users WHERE username = 'SarahRunner')),
   'Beautiful morning run today! Knocked off a 5K in preparation for next month\'s charity run. Who else is training for a race? 🏃‍♀️'),
  
  ((SELECT id FROM users WHERE username = 'SarahRunner'), 
   (SELECT id FROM workouts WHERE name = 'Yoga and Stretching' AND user_id = (SELECT id FROM users WHERE username = 'SarahRunner')),
   'Recovery is just as important as training! Taking time for yoga and stretching today to keep my body balanced. Namaste 🧘‍♀️'),
  
  -- Mike's posts
  ((SELECT id FROM users WHERE username = 'MikeLift'), 
   (SELECT id FROM workouts WHERE name = 'Deadlift Session' AND user_id = (SELECT id FROM users WHERE username = 'MikeLift')),
   'BEAST MODE ACTIVATED! Just pulled 405 lbs for 3 reps! 🔥 Been working toward this goal for months. Hard work pays off!'),
  
  ((SELECT id FROM users WHERE username = 'MikeLift'), 
   (SELECT id FROM workouts WHERE name = 'Bench Press Day' AND user_id = (SELECT id FROM users WHERE username = 'MikeLift')),
   'Focus on form today rather than weight. Sometimes you need to take a step back to move forward. Quality over quantity! 💯'),
  
  -- Additional non-workout posts
  ((SELECT id FROM users WHERE username = 'JohnFitness'), 
   NULL,
   'Just got some new workout gear! Can\'t wait to test it out tomorrow. What\'s your favorite fitness brand?'),
  
  ((SELECT id FROM users WHERE username = 'SarahRunner'), 
   NULL,
   'Rest day today but meal prepping for the week! Nutrition is a huge part of fitness success. What are your go-to healthy meals?'),
  
  ((SELECT id FROM users WHERE username = 'MikeLift'), 
   NULL,
   'Anyone have recommendations for good knee sleeves? Looking to upgrade my gym equipment.');

-- Create comments on posts
INSERT INTO comments (post_id, user_id, content)
VALUES
  -- Comments on John's posts
  ((SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE username = 'JohnFitness') AND content LIKE 'Hit a new bench press%'), 
   (SELECT id FROM users WHERE username = 'MikeLift'),
   'Awesome job man! What's your current max?'),
  
  ((SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE username = 'JohnFitness') AND content LIKE 'Hit a new bench press%'), 
   (SELECT id FROM users WHERE username = 'SarahRunner'),
   'Consistency is definitely key! Keep it up! 💪'),
  
  -- Comments on Sarah's posts
  ((SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE username = 'SarahRunner') AND content LIKE 'Beautiful morning run%'), 
   (SELECT id FROM users WHERE username = 'JohnFitness'),
   'I\'m doing a 10K next month! Good luck with your charity run!'),
  
  -- Comments on Mike's posts
  ((SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE username = 'MikeLift') AND content LIKE 'BEAST MODE%'), 
   (SELECT id FROM users WHERE username = 'JohnFitness'),
   'Absolute monster lift! That\'s incredible progress.'),
  
  ((SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE username = 'MikeLift') AND content LIKE 'BEAST MODE%'), 
   (SELECT id FROM users WHERE username = 'SarahRunner'),
   'Beast mode indeed! 🔥');

-- Add likes to posts
INSERT INTO likes (user_id, post_id)
VALUES
  -- Likes on John's posts
  ((SELECT id FROM users WHERE username = 'SarahRunner'), 
   (SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE username = 'JohnFitness') AND content LIKE 'Hit a new bench press%')),
  
  ((SELECT id FROM users WHERE username = 'MikeLift'), 
   (SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE username = 'JohnFitness') AND content LIKE 'Hit a new bench press%')),
  
  ((SELECT id FROM users WHERE username = 'SarahRunner'), 
   (SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE username = 'JohnFitness') AND content LIKE 'Never skip leg day%')),
  
  -- Likes on Sarah's posts
  ((SELECT id FROM users WHERE username = 'JohnFitness'), 
   (SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE username = 'SarahRunner') AND content LIKE 'Beautiful morning run%')),
  
  ((SELECT id FROM users WHERE username = 'MikeLift'), 
   (SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE username = 'SarahRunner') AND content LIKE 'Recovery is just%')),
  
  -- Likes on Mike's posts
  ((SELECT id FROM users WHERE username = 'JohnFitness'), 
   (SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE username = 'MikeLift') AND content LIKE 'BEAST MODE%')),
  
  ((SELECT id FROM users WHERE username = 'SarahRunner'), 
   (SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE username = 'MikeLift') AND content LIKE 'BEAST MODE%'));

-- Add follows between users
INSERT INTO follows (follower_id, following_id)
VALUES
  -- John follows
  ((SELECT id FROM users WHERE username = 'JohnFitness'), 
   (SELECT id FROM users WHERE username = 'SarahRunner')),
  
  ((SELECT id FROM users WHERE username = 'JohnFitness'), 
   (SELECT id FROM users WHERE username = 'MikeLift')),
  
  -- Sarah follows
  ((SELECT id FROM users WHERE username = 'SarahRunner'), 
   (SELECT id FROM users WHERE username = 'JohnFitness')),
  
  ((SELECT id FROM users WHERE username = 'SarahRunner'), 
   (SELECT id FROM users WHERE username = 'MikeLift')),
  
  -- Mike follows
  ((SELECT id FROM users WHERE username = 'MikeLift'), 
   (SELECT id FROM users WHERE username = 'JohnFitness'));