# GroupomAPI

GroupomAPI is the API for my Groupomania remake. This api is secure and straightforward.

<p align="left">
<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/danielcranney/readme-generator/main/public/icons/skills/javascript-colored.svg" width="36" height="36" alt="JavaScript" /></a><a href="https://nodejs.org/en/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/danielcranney/readme-generator/main/public/icons/skills/nodejs-colored.svg" width="36" height="36" alt="NodeJS" /></a><a href="https://expressjs.com/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/danielcranney/readme-generator/main/public/icons/skills/express-colored.svg" width="36" height="36" alt="Express" /></a><a href="https://www.mongodb.com/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/danielcranney/readme-generator/main/public/icons/skills/mongodb-colored.svg" width="36" height="36" alt="MongoDB" /></a>
</p>

## Run Locally

Clone the project into a directory of your choice

```bash
  git clone https://github.com/KBerliner/GroupomAPI.git
```

Go into the project directory

```bash
  cd my-project
```

Install dependencies

```bash
  npm i
```

Start the server

```bash
  npm start
```

## Running Tests

To run tests, run the following command

```bash
  npm test
```

## Usage

- Signup Endpoint

```javascript
    fetch(`${url}/api/users/signup`, {
        method: "POST"
        "content-type": "application/json"
        body: {
            username,
            email,
            password,
            lastLogin,
            created
        }
    });
```

- Login Endpoint

```javascript
fetch(`${url}/api/users/login`, {
	method: "POST",
	"content-type": "application/json",
	body: {
		email,
		password,
	},
});
```

- Delete Account Endpoint

```javascript
fetch(`${url}/api/users/delete/`, {
	method: "DELETE",
});
```

- Get Users Posts Endpoint

```javascript
fetch(`${url}/api/users/posts/:userId`);
```

- Create Post Endpoint

```javascript
fetch(`${url}/api/posts/`, {
	method: "POST",
	"content-type": "application/json",
	body: {
		title,
		author,
		authorId,
		caption,
		likesEnabled,
		lastUpdated,
		created,
	},
});
```

- Edit Post Endpoint

```javascript
fetch(`${url}/api/posts/update/:id`, {
	method: "PUT",
	"content-type": "application/json",
	body: {
		...post,
		likesEnabled: false,
	},
});
```

- Delete Post Endpoint

```javascript
fetch(`${url}/api/posts/delete/:id`, {
	method: "DELETE",
});
```

- Get All Posts Endpoint

```javascript
fetch(`${url}/api/posts/`);
```
