CREATE TABLE page_views (
id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
post_id INT(6) NOT NULL,
views INT(6) NOT NULL,
view_date TIMESTAMP
)
