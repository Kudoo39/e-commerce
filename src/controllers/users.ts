import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";

import usersService from "../services/users";
import {
  BadRequest,
  InternalServerError,
  NotFoundError,
  ConflictError,
} from "../errors/ApiError";
import User, { UserDocument } from "../model/User";
import apiErrorhandler from "../middlewares/apiErrorhandler";

export async function getAllUsers(
  _: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const Users = await usersService.getAllUsers();
    response.status(200).json(Users);
  } catch (error) {
    next(new InternalServerError());
  }
}

// REGISTER
export async function createUser(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { firstname, lastname, email, password, role } = request.body;

    // Check the required fields are provided
    if (!firstname || !lastname || !email || !password || !role) {
      throw new BadRequest("Fill out the required fields");
    }

    // check the valid role
    if (role !== "customer" && role !== "admin") {
      throw new BadRequest("Invalid role");
    }

    // Validate email
    if (!validator.isEmail(email)) {
      throw new BadRequest("Invalid email");
    }

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      firstname: firstname,
      lastname: lastname,
      email: email,
      password: hashedPassword,
      role: role,
    });
    const newUser = await usersService.createUser(user);
    response.status(201).json(newUser);
  } catch (error) {
    if (error instanceof ConflictError) {
      response.status(error.statusCode).json({
        message: error.message,
      });
      return;
    }
    next(new InternalServerError());
  }
}

// LOGIN
export async function loginUser(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { email, password } = request.body;
    const userData = await usersService.getUserByEmail(email);
    const hashedPassword = userData.password;

    const isMatched = await bcrypt.compare(password, hashedPassword);

    if (isMatched === false && password !== hashedPassword) {
      throw new BadRequest("Wrong password, please try again!");
    }

    // CREATE TOKEN
    const JWT_SECRET = process.env.JWT_SECRET as string;

    const token = jwt.sign(
      {
        // DO NOT PROVIDE PASSWORD HERE
        email: userData.email,
        role: userData.role,
        _id: userData._id,
      },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    response.json({ userData, token });
  } catch (error) {
    if (error instanceof BadRequest) {
      apiErrorhandler(error, request, response, next);
    }

    next(new InternalServerError());
  }
}

export async function updatedUser(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(request.body.password, salt);
    request.body.password = hashedPassword;

    const updatedUser = await usersService.updateUser(
      request.params.userId,
      request.body
    );
    
    response.status(200).json(updatedUser);
  } catch (error) {
    if (error instanceof NotFoundError) {
      apiErrorhandler(error, request, response, next);
    }

    if (error instanceof mongoose.Error.CastError) {
      response.status(404).json({
        message: `wrong id format`,
      });
      return;
    }

    next(new InternalServerError());
  }
}

export async function requestPassword(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const email = request.body.email;
    const user = await usersService.getUserByEmail(email);
    const userId = user._id

    request.body.password = "123";
    const updatedUser = await usersService.updateUser(userId, request.body);

    response.status(200).json(`Your one-time password is ${request.body.password}, please log in and change immediately!`);
  } catch (error) {
    if (error instanceof NotFoundError) {
      apiErrorhandler(error, request, response, next);
    }

    if (error instanceof mongoose.Error.CastError) {
      response.status(404).json({
        message: `wrong id format`,
      });
      return;
    }

    next(new InternalServerError());
  }
}

export async function deleteUser(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const deletedUser = await usersService.deleteUser(request.params.userId);
    if (deletedUser) {
      response.sendStatus(204);
    } else {
      response.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      apiErrorhandler(error, request, response, next);
    }

    if (error instanceof mongoose.Error.CastError) {
      response.status(404).json({
        message: `wrong id format`,
      });
      return;
    }

    next(new InternalServerError());
  }
}

// BAN A USER
export async function banUser(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const userId = request.params.userId;

    const updatedUser = await usersService.updateUser(userId, { banStatus: true });

    response.status(200).json({ message: "User banned successfully!", user: updatedUser });
  } catch (error) {
    next(new InternalServerError());
  }
}

// UNBAN A USER
export async function unbanUser(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const userId = request.params.userId;

    const updatedUser = await usersService.updateUser(userId, { banStatus: false });

    response.status(200).json({ message: "User unbanned successfully!", user: updatedUser });
  } catch (error) {
    next(new InternalServerError());
  }
}

