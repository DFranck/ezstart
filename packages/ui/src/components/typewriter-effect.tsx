'use client'

import { cn } from '../lib/utils'
import { motion, stagger, useAnimate, useInView, useAnimation } from 'motion/react'
import { useEffect, useState, useRef } from 'react'

export const TypewriterEffect = ({
  words,
  className,
  cursorClassName,
}: {
  words: {
    text: string
    className?: string
  }[]
  className?: string
  cursorClassName?: string
}) => {
  // split text inside of words into array of characters
  const wordsArray = words.map((word) => {
    return {
      ...word,
      text: word.text.split(''),
    }
  })

  const [scope, animate] = useAnimate()
  const isInView = useInView(scope)
  useEffect(() => {
    if (isInView) {
      animate(
        'span',
        {
          display: 'inline-block',
          opacity: 1,
          width: 'fit-content',
        },
        {
          duration: 0.3,
          delay: stagger(0.1),
          ease: 'easeInOut',
        }
      )
    }
  }, [isInView])

  const renderWords = () => {
    return (
      <motion.div ref={scope} className="inline">
        {wordsArray.map((word, idx) => {
          return (
            <div key={`word-${idx}`} className="inline-block">
              {word.text.map((char, index) => (
                <motion.span
                  initial={{}}
                  key={`char-${index}`}
                  className={cn(
                    `dark:text-white text-black opacity-0 hidden`,
                    word.className
                  )}
                >
                  {char}
                </motion.span>
              ))}
              &nbsp;
            </div>
          )
        })}
      </motion.div>
    )
  }
  return (
    <div
      className={cn(
        'text-sm sm:text-base md:text-xl lg:text-2xl xl:text-3xl font-bold text-center',
        className
      )}
    >
      {renderWords()}
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        className={cn(
          'inline-block rounded-sm w-[2px] sm:w-[3px] md:w-[4px] h-3 sm:h-4 md:h-5 lg:h-6 xl:h-8 bg-blue-500',
          cursorClassName
        )}
      ></motion.span>
    </div>
  )
}

export const TypewriterEffectSmooth = ({
  words,
  className,
  cursorClassName,
  duration = 2,
  delay = 1,
}: {
  words: {
    text: string
    className?: string
  }[]
  className?: string
  cursorClassName?: string
  duration?: number
  delay?: number
}) => {
  const [displayedChars, setDisplayedChars] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref)

  // Get total character count
  const totalChars = words.reduce((acc, word) => acc + word.text.length + 1, 0) - 1 // +1 for space, -1 for last

  // Reset and trigger animation when words change or when in view
  useEffect(() => {
    if (isInView) {
      setDisplayedChars(0)
      setIsComplete(false)

      const charDelay = (duration * 1000) / totalChars
      let currentChar = 0

      const timer = setTimeout(() => {
        const interval = setInterval(() => {
          currentChar++
          setDisplayedChars(currentChar)

          if (currentChar >= totalChars) {
            clearInterval(interval)
            setIsComplete(true)
          }
        }, charDelay)

        return () => clearInterval(interval)
      }, delay * 1000)

      return () => clearTimeout(timer)
    }
  }, [words, isInView, delay, duration, totalChars])

  const renderWords = () => {
    let charCount = 0
    let cursorPlaced = false

    return (
      <>
        {words.map((word, wordIdx) => {
          return (
            <span key={`word-${wordIdx}`} className="inline">
              {word.text.split('').map((char, charIdx) => {
                charCount++
                const shouldShow = charCount <= displayedChars
                const isLastVisibleChar = charCount === displayedChars

                return (
                  <span key={`char-${charIdx}`} className="inline">
                    <span
                      className={cn(
                        `transition-opacity duration-100`,
                        shouldShow ? 'opacity-100' : 'opacity-0',
                        word.className
                      )}
                    >
                      {char}
                    </span>
                    {isLastVisibleChar && !isComplete && !cursorPlaced && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          repeatType: 'reverse',
                        }}
                        className={cn(
                          'inline-block rounded-sm w-[2px] sm:w-[3px] md:w-[4px] h-3 sm:h-4 md:h-5 lg:h-6 xl:h-8 bg-blue-500',
                          cursorClassName
                        )}
                        onAnimationStart={() => { cursorPlaced = true }}
                      />
                    )}
                  </span>
                )
              })}
              {wordIdx < words.length - 1 && (
                <>
                  <span className={charCount + 1 <= displayedChars ? 'opacity-100' : 'opacity-0'}>
                    &nbsp;
                  </span>
                  {charCount + 1 === displayedChars && !isComplete && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        repeatType: 'reverse',
                      }}
                      className={cn(
                        'inline-block rounded-sm w-[2px] sm:w-[3px] md:w-[4px] h-3 sm:h-4 md:h-5 lg:h-6 xl:h-8 bg-blue-500',
                        cursorClassName
                      )}
                    />
                  )}
                </>
              )}
            </span>
          )
        })}
        {isComplete && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            className={cn(
              'inline-block rounded-sm w-[2px] sm:w-[3px] md:w-[4px] h-3 sm:h-4 md:h-5 lg:h-6 xl:h-8 bg-blue-500',
              cursorClassName
            )}
          />
        )}
      </>
    )
  }

  return (
    <div ref={ref} className={cn('my-6', className)}>
      <div className="text-sm sm:text-base md:text-xl lg:text-2xl xl:text-3xl font-bold inline">
        {renderWords()}
      </div>
    </div>
  )
}