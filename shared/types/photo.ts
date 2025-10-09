import type { Tags } from 'exiftool-vendored'

export interface NeededExif {
  Title?: string
  Subject?: string[]
  Keywords?: string[]

  zone?: string
  tz?: string
  tzSource?: string

  Orientation?: number
  Make?: string
  Model?: string
  Software?: string
  Artist?: string
  Copyright?: string

  ExposureTime?: string | number
  FNumber?: number
  ExposureProgram?: string
  ISO?: number
  ShutterSpeedValue?: string | number
  ApertureValue?: number
  BrightnessValue?: number
  ExposureCompensation?: number
  MaxApertureValue?: number

  OffsetTime?: string
  OffsetTimeOriginal?: string
  OffsetTimeDigitized?: string

  LightSource?: string
  Flash?: string

  FocalLength?: string
  FocalLengthIn35mmFormat?: string

  LensMake?: string
  LensModel?: string

  ColorSpace?: string

  ExposureMode?: string
  SceneCaptureType?: string

  Aperture?: number
  ScaleFactor35efl?: number
  ShutterSpeed?: string | number
  LightValue?: number

  DateTimeOriginal?: string
  DateTimeDigitized?: string

  ImageWidth?: number
  ImageHeight?: number

  MeteringMode: Tags['MeteringMode']
  WhiteBalance: Tags['WhiteBalance']
  WBShiftAB: Tags['WBShiftAB']
  WBShiftGM: Tags['WBShiftGM']
  WhiteBalanceBias: Tags['WhiteBalanceBias']
  WhiteBalanceFineTune: Tags['WhiteBalanceFineTune']
  FlashMeteringMode: Tags['FlashMeteringMode']
  SensingMethod: Tags['SensingMethod']
  FocalPlaneXResolution: Tags['FocalPlaneXResolution']
  FocalPlaneYResolution: Tags['FocalPlaneYResolution']
  GPSAltitude: Tags['GPSAltitude']
  GPSLatitude: Tags['GPSLatitude']
  GPSLongitude: Tags['GPSLongitude']
  GPSAltitudeRef: Tags['GPSAltitudeRef']
  GPSLatitudeRef: Tags['GPSLatitudeRef']
  GPSLongitudeRef: Tags['GPSLongitudeRef']

  // HDR Type
  MPImageType?: Tags['MPImageType']

  Rating?: number

  // Motion Photo (XMP) related fields
  MotionPhoto?: Tags['MotionPhoto']
  MotionPhotoVersion?: Tags['MotionPhotoVersion']
  MotionPhotoPresentationTimestampUs?: Tags['MotionPhotoPresentationTimestampUs']
  MicroVideo?: Tags['MicroVideo']
  MicroVideoVersion?: Tags['MicroVideoVersion']
  MicroVideoOffset?: Tags['MicroVideoOffset']
  MicroVideoPresentationTimestampUs?: Tags['MicroVideoPresentationTimestampUs']
}

export interface PhotoInfo {
  title: string
  dateTaken: string
  tags: string[]
  description: string
}
