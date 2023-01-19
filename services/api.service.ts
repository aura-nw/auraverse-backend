/* eslint-disable capitalized-comments */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { ServerResponse } from "http";
import * as jwt from "jsonwebtoken";
import { Service, ServiceBroker, Context } from "moleculer";
import ApiGateway from "moleculer-web";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import * as dotenv from "dotenv";
import { AccountType, Config } from "../common";
import { RequestMessage } from "../types";
import { DatabaseAccountMixin } from "../mixins/database";

dotenv.config();

export default class ApiService extends Service {
	private accountMixin = new DatabaseAccountMixin();

	public constructor(broker: ServiceBroker) {
		super(broker);
		this.parseServiceSchema({
			name: "api",
			mixins: [ApiGateway],
			// More info about settings: https://moleculer.services/docs/0.14/moleculer-web.html
			settings: {
				port: process.env.BASE_PORT || 3000,

				use: [
					cookieParser(),
					helmet({
						contentSecurityPolicy: {
							directives: {
								"default-src": ["'self'"],
								"base-uri": ["'self'"],
								// "block-all-mixed-content",
								"font-src": ["'self'"],
								"frame-ancestors": ["'self'"],
								"img-src": ["'self'"],
								"object-src": ["'none'"],
								"script-src": ["'self'", "'unsafe-inline'"],
								"script-src-attr": ["'none'"],
								"style-src": ["'self'", "'unsafe-inline'"],
								"upgrade-insecure-requests": [],
							},
						},
					}),
				],
				cors: {
					origin: ["*"],
					methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE"],
					credentials: false,
					maxAge: 3600,
				},
				routes: [
					// Moleculer-auto-openapi routes
					{
						path: "/openapi",
						aliases: {
							"GET /openapi.json": "openapi.generateDocs", // Swagger scheme
							"GET /ui": "openapi.ui", // Ui
						},
					},
					{
						path: "/api",
						// Route-level Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
						use: [],
						// Enable/disable parameter merging method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Disable-merging
						mergeParams: true,

						// Enable authentication. Implement the logic into `authenticate` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authentication
						authentication: true,

						// Enable authorization. Implement the logic into `authorize` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authorization
						authorization: true,
						cors: {
							origin: ["*"],
							methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE"],
							credentials: true,
							maxAge: 3600,
						},
						aliases: {
							// Account
							"POST /account/change-password": "account.changePassword",
							"POST /account/change-email": "account.changeEmail",
							"POST /account/verify-code-id-ownership": "account.verifyCodeIdOwnership",

							// Project
							"POST /project/create": "project.createProject",
							"POST /project/update": "project.updateProject",
							"GET /project/list/:accountId": "project.listYourProjects",

							// Request
							"GET /request/list/:accountId": "request.listYourRequests",
							"GET /request/details/:id": "request.requestDetails",
							"POST /request/store-code-id": "request.requestStoreCodeId",
						},
						/**
						 * Before call hook. You can check the request.
						 * @param {Context} ctx
						 * @param {Object} route
						 * @param {IncomingMessage} req
						 * @param {ServerResponse} res
						 * @param {Object} data
						onBeforeCall(ctx: Context<any,{userAgent: string}>,
						 route: object, req: IncomingMessage, res: ServerResponse) {
						  Set request headers to context meta
						  ctx.meta.userAgent = req.headers["user-agent"];
						},
						 */

						/**
						 * After call hook. You can modify the data.
						 * @param {Context} ctx
						 * @param {Object} route
						 * @param {IncomingMessage} req
						 * @param {ServerResponse} res
						 * @param {Object} data
						 *
						 onAfterCall(ctx: Context, route: object, req: IncomingMessage, res: ServerResponse, data: object) {
						// Async function which return with Promise
						return doSomething(ctx, res, data);
					},
						 */

						// Calling options. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Calling-options
						callingOptions: {},

						bodyParsers: {
							json: {
								strict: false,
								limit: "1MB",
							},
							urlencoded: {
								extended: true,
								limit: "1MB",
							},
						},

						// Mapping policy setting. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
						mappingPolicy: Config.MAPPING_POLICY, // Available values: "all", "restrict"

						// Enable/disable logging
						logging: true,
					},
					{
						path: "/admin",
						// Route-level Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
						use: [],
						// Enable/disable parameter merging method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Disable-merging
						mergeParams: true,

						// Enable authentication. Implement the logic into `authenticate` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authentication
						authentication: true,

						// Enable authorization. Implement the logic into `authorize` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authorization
						authorization: true,
						cors: {
							origin: ["*"],
							methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE"],
							credentials: true,
							maxAge: 3600,
						},
						roles: [AccountType.ADMIN],
						aliases: {
							// Request
							"GET /request/list": "request.listRequests",
							"POST /request/confirm": "request.confirmRequest",
							"POST /request/reject": "request.rejectRequest",
						},
						/**
						 * Before call hook. You can check the request.
						 * @param {Context} ctx
						 * @param {Object} route
						 * @param {IncomingMessage} req
						 * @param {ServerResponse} res
						 * @param {Object} data
						 */
						onBeforeCall(
							ctx: Context<Record<string, unknown>, any>,
							route: any,
							req: RequestMessage
						) {
							this.logger.info("onBeforeCall in protected route");
							ctx.meta.authToken = req.headers.authorization;
						},

						/**
						 * After call hook. You can modify the data.
						 * @param {Context} ctx
						 * @param {Object} route
						 * @param {IncomingMessage} req
						 * @param {ServerResponse} res
						 * @param {Object} data
						 */
						onAfterCall(
							ctx: Context<Record<string, unknown>, any>,
							route: any,
							req: RequestMessage,
							res: ServerResponse,
							data: Record<string, any>
						) {
							this.logger.info("onAfterCall in protected route");
							res.setHeader("X-Custom-Header", "Authorized path");
							return data;
						},

						// Calling options. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Calling-options
						callingOptions: {},

						bodyParsers: {
							json: {
								strict: false,
								limit: "1MB",
							},
							urlencoded: {
								extended: true,
								limit: "1MB",
							},
						},

						// Mapping policy setting. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
						mappingPolicy: Config.MAPPING_POLICY, // Available values: "all", "restrict"

						// Enable/disable logging
						logging: true,
					},
					{
						path: "/public",
						// Route-level Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
						use: [],
						// Enable/disable parameter merging method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Disable-merging
						mergeParams: true,

						// Enable authentication. Implement the logic into `authenticate` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authentication
						authentication: false,

						// Enable authorization. Implement the logic into `authorize` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authorization
						authorization: false,

						aliases: {
							// Auth
							"POST /auth/sign-up": "auth.signUp",
							"GET /auth/confirm/:confirmationToken": "auth.confirmSignUp",
							"POST /auth/login": "auth.login",
							"POST /auth/forgot-password": "auth.forgotPassword",

							// Project
							"GET /project/list": "project.listProjects",
							"GET /project/details/:id": "project.projectDetails",
						},

						// Calling options. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Calling-options
						callingOptions: {},

						bodyParsers: {
							json: {
								strict: false,
								limit: "1MB",
							},
							urlencoded: {
								extended: true,
								limit: "1MB",
							},
						},

						// Mapping policy setting. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
						mappingPolicy: Config.MAPPING_POLICY, // Available values: "all", "restrict"

						// Enable/disable logging
						logging: true,
					},
				],
				// Do not log client side errors (does not log an error response when the error.code is 400<=X<500)
				log4XXResponses: false,
				// Logging the request parameters. Set to any log level to enable it. E.g. "info"
				logRequestParams: null,
				// Logging the response data. Set to any log level to enable it. E.g. "info"
				logResponseData: null,
				// Serve assets from "public" folder
				assets: {
					folder: "public",
					// Options to `server-static` module
					options: {},
				},
			},

			methods: {

				/**
				 * Authenticate the request. It checks the `Authorization` token value in the request header.
				 * Check the token value & resolve the user by the token.
				 * The resolved user will be available in `ctx.meta.user`
				 *
				 * PLEASE NOTE, IT"S JUST AN EXAMPLE IMPLEMENTATION. DO NOT USE IN PRODUCTION!
				 *
				 * @param {Context} ctx
				 * @param {any} route
				 * @param {IncomingMessage} req
				 * @returns {Promise}

				authenticate: async (
					ctx: Context<Record<string, unknown>, any>,
					route: any,
					req: RequestMessage,
				): Promise<unknown> => {

				},
				 */

				/**
				 * Authorize the request. Check that the authenticated user has right to access the resource.
				 *
				 * PLEASE NOTE, IT'S JUST AN EXAMPLE IMPLEMENTATION. DO NOT USE IN PRODUCTION!
				 *
				 * @param {Context} ctx
				 * @param {Object} route
				 * @param {IncomingMessage} req
				 * @returns {Promise}
				 */
				authorize: async (
					ctx: Context<Record<string, unknown>, any>,
					route: any,
					req: RequestMessage
				): Promise<any> => {
					const auth = req.headers.authorization;

					if (auth) {
						const type = auth.split(" ")[0];
						let token: string | undefined;
						if (type === "Token" || type === "Bearer") {
							token = auth.split(" ")[1];
						}

						if (token) {
							try {
								const decoded: jwt.JwtPayload = jwt.verify(token, Config.JWT_SECRET!) as jwt.JwtPayload;
								if (decoded) {
									if (route.opts.roles) {
										if (route.opts.roles.indexOf(decoded.accountType) === -1) {
											return Promise.reject(new ApiGateway.Errors.UnAuthorizedError("Permission denied!", null));
										}
									}

									const user = await this.accountMixin.findOne({ id: decoded.id });
									if (user && Date.now() < decoded.exp! * 1000) {
										ctx.meta.user = user;
										return Promise.resolve(user);
									}
								}
							} catch (error) {
								this.logger.error("Authentication error", error);
							}
						}
						console.log("Authentication token failed");
						return Promise.reject(new ApiGateway.Errors.UnAuthorizedError(ApiGateway.Errors.ERR_INVALID_TOKEN, null));
					}
					console.log("Authentication auth failed");
					return Promise.reject(new ApiGateway.Errors.UnAuthorizedError(ApiGateway.Errors.ERR_NO_TOKEN, null));
				},
			},

		});
	}
}
