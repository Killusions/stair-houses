# STAIR Houses

Displaying and editing STAIR Houses points on the web.

## About The Project

This project is used to display and edit the current points total of the STAIR "houses".

It provides a public website to view the scores as well as a password protected admin panel to add and remove points.

The project consists of a frontend as well as a backend which the frontend connects with and where the points are stored.

The frontend is deployed [here](https://stair.ch/houses).

### Built With

This project is build with modern web-technologies, the most important are:

#### Frontend

* [Vue.js 3 (Composition API)](https://vuejs.org/)
* [Vite](https://vitejs.dev)
* [SCSS/Sass](https://sass-lang.com)
* [Vue Router](https://router.vuejs.org)

#### Shared / Both

* [Typescript](https://www.typescriptlang.org)
* [tRPC](https://trpc.io)
* [WebSockets](https://developer.mozilla.org/de/docs/Web/API/WebSockets_API)
* [RxJS](https://rxjs.dev)

#### Backend

* [Node.js](https://nodejs.org/en/)
* [fastify](https://www.fastify.io)
* [MongoDB](https://www.mongodb.com)

<!-- GETTING STARTED -->
## Getting Started

To set up the project locally follow the following steps.

### Prerequisites

To install and run the project you will need the following:

#### General / Shared

* Git: [install (click here)](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
* a recent version of Node.js and npm:
[install (click here)](https://nodejs.dev/learn/how-to-install-nodejs), update:

  ```sh
  npm install npm@latest -g
  npm install -g node
  ```

* Yarn v1.x (not 2): [install instructions](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable) or use

  ```sh
  npm install --global yarn
  ```
  
#### Backend

* MongoDB: [install (click here)](https://www.mongodb.com/docs/guides/server/install/)

#### Frontend

* A (or better multiple) modern browser(s)

### Installation and running

To install and run the project use the following commands.

#### General

1. Clone the repo

   ```sh
   git clone git@github.com:stairch/stair-houses.git
   ```

   or

   ```sh
   git clone https://github.com/stairch/stair-houses.git
   ```

2. Enter the directory

   ```sh
   cd stair-houses
   ```

3. Install NPM packages at root level (This will install husky for commitlint.)

   ```sh
   yarn
   ```

#### Frontend

4. Enter the directory

   ```sh
   cd frontend
   ```

5. Install NPM packages for the frontend

   ```sh
   yarn
   ```

6. Start Vite with auto-recomple and auto-refresh on changes (no type checking)

   ```sh
   yarn dev
   ```

   or build fully it once (includes type checking and will use production configuration)

   ```sh
   yarn build
   ```

7. Format using linters

   ```sh
   yarn format:all
   ```

   and lint it afterwards

   ```sh
   yarn lint:all
   ```

#### Backend

4. Enter the directory

   ```sh
   cd backend
   ```

5. Install NPM packages for the backend

   ```sh
   yarn
   ```

6. Run typescript with auto-recompile on changes

   ```sh
   yarn watch
   ```

   or build it once

   ```sh
   yarn build
   ```

7. **Open a new shell instance/terminal** and navigate to the same location

   ```sh
   cd stair-houses
   cd backend
   ```

8. Run the program with Node.js and auto-restart on changes

   ```sh
   yarn serve
   ```

   or run it once

   ```sh
   yarn start
   ```

9.  Format using linters

   ```sh
   yarn format:all
   ```

   and lint it afterwards

   ```sh
   yarn lint:all
   ```

### Configuration, building and deployment

This project is configured by default to run on localhost and in development configuration.
To configure and build it for production, set the following environment variables:

#### Frontend

```sh
VITE_STAIR_HOUSES_PROTOCOL="wss"
VITE_STAIR_HOUSES_BACKEND_HOST="<domain>"
VITE_STAIR_HOUSES_BACKEND_PORT="3033"
```

These can be set in a `.env.production.local` file in the `frontend` directory so they will be used for every full build (using `yarn build`), but not for testing and development (using `yarn dev`).
(Or create a `.env` file to also use it while testing and development.)

In the frontend the environment variables will be loaded in at compile/build time an can therefore be omitted when deploying the compiled/built `dist` files on a webserver.

#### Backend

```sh
STAIR_HOUSES_PORT="3033"
STAIR_HOUSES_IP="<server IP address, NOT DOMAIN!!!>"
STAIR_HOUSES_SSL_CERT="<file path to ssl certificate (can be omitted, then http/ws will be used)>"
STAIR_HOUSES_SSL_KEY="<file path to ssl private key (can be omitted together with the certificate)>"
STAIR_HOUSES_FRONTEND_HOST="stair.ch"
STAIR_HOUSES_DEFAULT_PASSWORD="<default password to be set on first connection to database, if not set already, SHOULD BE REMOVED/OMITTED LATER!!!>"
STAIR_HOUSES_DATABASE_HOST="localhost"
STAIR_HOUSES_DATABASE_PORT="27017"
STAIR_HOUSES_DATABASE_USER="<MongoDB user (can be omitted)>"
STAIR_HOUSES_DATABASE_PASSWORD="<MongoDB password (can be omitted)
```

These can also be set in a `.env` file in the directory it's run from. WARNING: Unlike in the frontend, they will be used for every run (including testing and development). They are not needed at compile time and can be omitted for most testing and development setups.

Since the environment variables will be loaded at runtime they need to be included when deploying the compiled `dist` files on a server.

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

**Important**: To keep this project clean and easily readable, we use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) and an entire suite of linters.
Before submitting your Pull Request, check that you have followed conventional commits and run the format and lint commands mentioned above.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/add-amazing-feature`)
3. Commit your Changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the Branch (`git push origin feat/add-amazing-feature`)
5. Open a Pull Request

## License

Distributed under the GNU General Public License v3.0. See `LICENSE` for more information.

<p align="right">(<a href="#top">back to top</a>)</p>
