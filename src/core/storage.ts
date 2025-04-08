import * as S3_Client from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { blue, green } from "colorette";
import { addDays } from "date-fns";
import fs from "fs";
import { logger } from "../config/pino";
import { ms } from "../config/ms";

/**
 * Interface for expiration object returned by the S3 storage provider
 */
export interface DtoExpiresObject {
  expiresIn: number;
  expiryDate: Date;
}

/**
 * Valid expiration periods for S3 storage objects
 */
export type StorageExpires = "1d" | "2d" | "3d" | "4d" | "5d" | "6d" | "7d";

/**
 * Type alias for AWS S3 client
 */
export type TypeS3 = S3_Client.S3;

/**
 * Configuration entity for S3 storage provider
 */
export interface StorageProviderEntity {
  accessKey: string;
  secretKey?: string;
  region: string;
  bucket: string;
  expires: StorageExpires;
}

/**
 * File attributes interface for uploaded files
 */
export interface FileAttributes {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

/**
 * Type for file instance records
 */
export type FileInstance = Record<string, FileAttributes>;

/**
 * AWS S3 Storage Provider
 *
 * This class provides a complete interface for interacting with AWS S3 storage,
 * including bucket creation, file uploads, and generating presigned URLs.
 */
export class StorageProvider {
  private readonly _accessKey: string;
  private readonly _secretKey?: string;
  private readonly _region: string;
  private readonly _bucket: string;
  private readonly _expires: StorageExpires | string;
  private readonly _clientS3: S3_Client.S3;

  /**
   * Creates a new S3 storage provider instance
   * @param params Configuration parameters for the S3 storage provider
   */
  constructor(params: StorageProviderEntity) {
    this._accessKey = params.accessKey;
    this._secretKey = params?.secretKey;
    this._region = params.region;
    this._bucket = params.bucket;
    this._expires = params.expires;

    // Initialize AWS S3 client
    this._clientS3 = new S3_Client.S3({
      credentials: {
        accessKeyId: this._accessKey,
        secretAccessKey: String(this._secretKey),
      },
      region: this._region,
    });
  }

  /**
   * Calculates expiration time for S3 objects based on configured expiry period
   * @returns Object containing expiration time in milliseconds and expiry date
   */
  public expiresObject(): DtoExpiresObject {
    const getExpired = this._expires.replace(/[^0-9]/g, "");

    const expiresIn = ms(this._expires);
    const expiryDate = addDays(new Date(), Number(getExpired));

    return { expiresIn, expiryDate };
  }

  /**
   * Returns the S3 client instance for direct operations
   *
   * @example
   * ```typescript
   * import { TypeS3 } from './storage'
   *
   * const storage = new StorageProvider({
   *   accessKey: 'your-access-key',
   *   secretKey: 'your-secret-key',
   *   region: 'your-region',
   *   bucket: 'your-bucket',
   *   expires: '1d'
   * })
   * const s3 = storage.client().getObject()
   * ```
   *
   * @returns AWS S3 client instance
   */
  public client(): TypeS3 {
    return this._clientS3;
  }

  /**
   * Creates a new S3 bucket with the configured name
   * @private
   */
  private async _createS3Bucket(): Promise<void> {
    const msgType = `${green("storage - aws s3")}`;
    const bucketName = this._bucket;

    try {
      const data = await this._clientS3.createBucket({
        Bucket: bucketName,
      });

      const storageBucket = `${blue(`${bucketName}`)}`;
      const message = `${msgType} success create bucket: ${storageBucket}`;
      logger.info(message);

      console.log(data);
    } catch (err: any) {
      const message = `${msgType} err, ${err.message ?? err}`;
      logger.error(message);

      process.exit();
    }
  }

  /**
   * Initializes the S3 connection by checking if the bucket exists
   * and creating it if it doesn't
   * @private
   */
  private async _initialS3(): Promise<any> {
    const msgType = `${green("storage - aws s3")}`;
    const bucketName = this._bucket;

    try {
      const data = await this._clientS3.send(
        new S3_Client.GetBucketAclCommand({ Bucket: bucketName })
      );

      const storageBucket = `${blue(`${bucketName}`)}`;
      const message = `${msgType} success get bucket: ${storageBucket}`;
      logger.info(message);

      console.log(data?.Grants);
    } catch (err: any) {
      const message = `${msgType} err, ${err.message ?? err}`;
      logger.error(message);

      await this._createS3Bucket();
    }
  }

  /**
   * Initializes the S3 storage provider by checking and creating the bucket if needed
   */
  public async initialize(): Promise<void> {
    await this._initialS3();
  }

  /**
   * Generates a presigned URL for accessing a file in the S3 bucket
   * @param keyFile The key (path) of the file in the S3 bucket
   * @returns Presigned URL string with temporary access to the file
   */
  public async getPresignedURL(keyFile: string): Promise<string> {
    const command = new S3_Client.GetObjectCommand({
      Bucket: this._bucket,
      Key: keyFile,
    });

    const { expiresIn } = this.expiresObject();
    const newExpiresIn = expiresIn / 1000;

    const signedURL = await getSignedUrl(this._clientS3, command, {
      expiresIn: newExpiresIn,
    });

    return signedURL;
  }

  /**
   * Generates a key file path by joining path segments
   * @param values Array of path segments to join
   * @returns Joined path string
   * @private
   */
  private _generateKeyFile(values: string[]): string {
    const result = values.join("/");
    return result;
  }

  /**
   * Uploads a file to the S3 bucket
   * @param fieldUpload File attributes of the file to upload
   * @param directory Directory path within the bucket to store the file
   * @returns Object containing upload result data and a presigned URL for accessing the file
   */
  public async uploadFile<T>(
    fieldUpload: FileAttributes,
    directory: string
  ): Promise<{ data: T; signedURL: string }> {
    const keyFile = this._generateKeyFile([directory, fieldUpload.filename]);

    // Upload file to AWS S3
    const data = await this._clientS3.send(
      new S3_Client.PutObjectCommand({
        Bucket: this._bucket,
        Key: keyFile,
        Body: fs.createReadStream(fieldUpload.path),
        ContentType: fieldUpload.mimetype,
        ContentDisposition: `inline; filename=${fieldUpload.filename}`,
        ACL: "public-read",
      })
    );

    const signedURL = await this.getPresignedURL(keyFile);
    const result = { data, signedURL } as { data: T; signedURL: string };

    return result;
  }

  /**
   * Deletes a file from the S3 bucket
   * @param keyFile The key (path) of the file in the S3 bucket to delete
   * @returns Result of the delete operation
   */
  public async deleteFile<T>(keyFile: string): Promise<T> {
    const data = await this._clientS3.send(
      new S3_Client.DeleteObjectCommand({
        Bucket: this._bucket,
        Key: keyFile,
      })
    );

    return data as T;
  }

  /**
   * Lists objects in a directory within the S3 bucket
   * @param directory Directory path within the bucket to list objects from
   * @returns List of objects in the specified directory
   */
  public async listObjects<T>(directory: string): Promise<T> {
    const data = await this._clientS3.send(
      new S3_Client.ListObjectsV2Command({
        Bucket: this._bucket,
        Prefix: directory,
      })
    );

    return data as T;
  }
}
