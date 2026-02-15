using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Linq;

namespace HashCracker;

/// <summary>
/// Provides functionality to verify hashes against a wordlist.
/// </summary>
public class Program
{
    public enum HashAlgorithmType
    {
        Md5 = 0,
        Sha1 = 1
    }

    public static void Main(string[] args)
    {
        var targetPath = GetArg(args, "-t");
        var wordlistPath = GetArg(args, "-l");
        var algArg = GetArg(args, "-a");
        bool debug = args.Contains("-d");

        if (string.IsNullOrEmpty(targetPath) || string.IsNullOrEmpty(wordlistPath) || !Enum.TryParse(algArg, true, out HashAlgorithmType alg))
        {
            Console.WriteLine("Usage: -t <target_file> -l <wordlist_file> -a <md5|sha1> [-d]");
            return;
        }

        if (!File.Exists(targetPath) || !File.Exists(wordlistPath))
        {
            Console.WriteLine("Error: Target or wordlist file not found.");
            return;
        }

        string targetHash = File.ReadAllText(targetPath).Trim().ToLowerInvariant();
        string? foundWord = null;

        using HashAlgorithm hashAlgo = alg == HashAlgorithmType.Md5 ? MD5.Create() : SHA1.Create();

        foreach (string word in File.ReadLines(wordlistPath))
        {
            byte[] inputBytes = Encoding.UTF8.GetBytes(word);
            byte[] hashBytes = hashAlgo.ComputeHash(inputBytes);
            string currentHash = Convert.ToHexString(hashBytes).ToLowerInvariant();

            if (debug)
            {
                Console.WriteLine($"{word}: {currentHash}");
            }

            if (currentHash == targetHash)
            {
                foundWord = word;
                break;
            }
        }

        if (foundWord != null)
        {
            Console.WriteLine($"Match found: {foundWord}");
        }
        else
        {
            Console.WriteLine("No match found in wordlist.");
        }
    }

    private static string? GetArg(string[] args, string flag)
    {
        int index = Array.IndexOf(args, flag);
        return index >= 0 && index < args.Length - 1 ? args[index + 1] : null;
    }
}